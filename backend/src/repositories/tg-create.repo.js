import { query, queryOne, getPool } from '../utils/db.js';

/**
 * Check if a TG reference is unique (excluding deleted TGs).
 */
export const checkReferenceUnique = async (reference) => {
  const row = await queryOne(
    `SELECT 1 FROM TG WHERE TG_Reference = ? AND Status_Code != 'DEL'`,
    [reference]
  );
  return !row;
};

/**
 * Search UPOV codes for autocomplete.
 */
export const searchUpovCodes = async (term) => {
  const like = `%${term}%`;
  return query(
    `SELECT UpovCode_ID as id, Upov_Code as code, Principal_Botanical_Name as botanicalName
     FROM Upov_Code
     WHERE Upov_Code LIKE ? OR Principal_Botanical_Name LIKE ?
     ORDER BY Upov_Code
     LIMIT 20`,
    [like, like]
  );
};

/**
 * Search TGs for the "based on existing" autocomplete.
 */
export const searchTestGuidelines = async (term) => {
  const like = `%${term}%`;
  return query(
    `SELECT tg.TG_ID as id, tg.TG_Reference as reference, tg.TG_Name as name, tg.Status_Code as status,
       tg.CPI_TechWorkParty as techWorkParty, tg.CPI_Original as originalLanguage,
       up.Full_Name as leadExpert, up.Office_Code as leadExpertCountry,
       GROUP_CONCAT(DISTINCT uc.Upov_Code ORDER BY tuc.seqNumber SEPARATOR ', ') as upovCodes
     FROM TG tg
     LEFT JOIN Tg_Users tu ON tg.TG_ID = tu.TG_ID AND tu.Role_Code = 'LE'
     LEFT JOIN User_Profile up ON tu.User_ID = up.User_ID
     LEFT JOIN TG_UPOVCode tuc ON tuc.TG_ID = tg.TG_ID
     LEFT JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID
     WHERE tg.Status_Code NOT IN ('DEL')
       AND (tg.TG_Reference LIKE ? OR tg.TG_Name LIKE ? OR uc.Upov_Code LIKE ?)
     GROUP BY tg.TG_ID
     ORDER BY tg.TG_lastupdated DESC
     LIMIT 15`,
    [like, like, like]
  );
};

/**
 * Fetch all data needed to populate the wizard when a source TG is selected.
 */
export const findSourceTgForCopy = async (tgId) => {
  const tg = await queryOne(
    `SELECT tg.TG_ID as id, tg.TG_Reference as reference, tg.TG_Name as name,
       tg.Status_Code as status, tg.CPI_TechWorkParty as techWorkParty,
       tg.CPI_Original as originalLanguage, IFNULL(ext.isMushroom, 'N') as isMushroom,
       up.Full_Name as leadExpert,
       DATE_FORMAT(tg.LE_Draft_StartDate, '%Y-%m-%d') as leDraftStart,
       DATE_FORMAT(tg.LE_Draft_EndDate, '%Y-%m-%d') as leDraftEnd,
       DATE_FORMAT(tg.IE_Comments_StartDate, '%Y-%m-%d') as ieCommentsStart,
       DATE_FORMAT(tg.IE_Comments_EndDate, '%Y-%m-%d') as ieCommentsEnd,
       DATE_FORMAT(tg.LE_Checking_StartDate, '%Y-%m-%d') as leCheckingStart,
       DATE_FORMAT(tg.LE_Checking_EndDate, '%Y-%m-%d') as leCheckingEnd,
       DATE_FORMAT(tg.Send_TO_UPOVDate, '%Y-%m-%d') as sentToUpov,
       IFNULL(tg.isPartialRevision, 'N') as isPartialRevision
     FROM TG tg
     LEFT JOIN TG_Extended ext ON ext.TG_ID = tg.TG_ID
     LEFT JOIN Tg_Users tu ON tg.TG_ID = tu.TG_ID AND tu.Role_Code = 'LE'
     LEFT JOIN User_Profile up ON tu.User_ID = up.User_ID
     WHERE tg.TG_ID = ?`,
    [tgId]
  );
  if (!tg) return null;

  const upovCodes = await query(
    `SELECT uc.UpovCode_ID as id, uc.Upov_Code as code, uc.Principal_Botanical_Name as botanicalName
     FROM TG_UPOVCode tuc
     JOIN Upov_Code uc ON tuc.UpovCode_ID = uc.UpovCode_ID
     WHERE tuc.TG_ID = ?
     ORDER BY tuc.seqNumber`,
    [tgId]
  );

  const deadlines = {
    leDraftStart: tg.leDraftStart,
    leDraftEnd: tg.leDraftEnd,
    ieCommentsStart: tg.ieCommentsStart,
    ieCommentsEnd: tg.ieCommentsEnd,
    leCheckingStart: tg.leCheckingStart,
    leCheckingEnd: tg.leCheckingEnd,
    sentToUpov: tg.sentToUpov,
  };
  // Remove flat deadline fields from top level
  delete tg.leDraftStart;
  delete tg.leDraftEnd;
  delete tg.ieCommentsStart;
  delete tg.ieCommentsEnd;
  delete tg.leCheckingStart;
  delete tg.leCheckingEnd;
  delete tg.sentToUpov;

  return { ...tg, upovCodes, deadlines };
};

/**
 * Look up current year's technical body session deadlines.
 */
export const findSessionDeadlines = async (twpCode, year) => {
  return queryOne(
    `SELECT
       DATE_FORMAT(LE_Draft_EndDate, '%Y-%m-%d') as leDraftEnd,
       DATE_FORMAT(IE_Comments_StartDate, '%Y-%m-%d') as ieCommentsStart,
       DATE_FORMAT(IE_Comments_EndDate, '%Y-%m-%d') as ieCommentsEnd,
       DATE_FORMAT(LE_Checking_StartDate, '%Y-%m-%d') as leCheckingStart,
       DATE_FORMAT(LE_Checking_EndDate, '%Y-%m-%d') as leCheckingEnd,
       DATE_FORMAT(Send_TO_UPOVDate, '%Y-%m-%d') as sentToUpov
     FROM technical_body
     WHERE TB_Code = ? AND TB_Year = ?
     LIMIT 1`,
    [twpCode, year]
  );
};

/**
 * Helper: copy rows from a table, replacing FK and resetting timestamps.
 * Returns array of { old, new } PK mappings for cascading to child tables.
 */
async function copyRows(conn, { table, pk, fk, oldFkVal, newFkVal }) {
  const [rows] = await conn.execute(
    `SELECT * FROM \`${table}\` WHERE \`${fk}\` = ?`, [oldFkVal]
  );
  const mappings = [];
  for (const row of rows) {
    const oldPk = row[pk];
    delete row[pk];
    row[fk] = newFkVal;
    if ('Modified_Time' in row) row.Modified_Time = null;
    if ('Created_Time' in row) row.Created_Time = new Date();
    if ('createdTime' in row) row.createdTime = new Date();
    if ('modifiedTime' in row) row.modifiedTime = null;

    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(', ');
    const [result] = await conn.execute(
      `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
      cols.map(c => row[c])
    );
    mappings.push({ old: oldPk, new: result.insertId });
  }
  return mappings;
}

/**
 * Create a new TG draft with UPOV codes, extended data, and auto-assigned users.
 * Uses a transaction across TG, TG_UPOVCode, TG_Extended, and Tg_Users.
 */
export const updateTg = async ({ tgId, reference, name, techWorkParty, languageCode, isMushroom, adminComments, upovCodeIds, deadlines, isPartialRevision, status }) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE TG SET
        TG_Reference = ?, TG_Name = ?, CPI_TechWorkParty = ?, CPI_Original = ?,
        AdminComments = ?,
        LE_Draft_StartDate = ?,
        LE_Draft_EndDate = ?, IE_Comments_StartDate = ?, IE_Comments_EndDate = ?,
        LE_Checking_StartDate = ?, LE_Checking_EndDate = ?, Send_TO_UPOVDate = ?,
        isPartialRevision = ?,
        ${status ? 'Status_Code = ?,' : ''}
        TG_lastupdated = NOW()
      WHERE TG_ID = ?`,
      [reference, name, techWorkParty, languageCode, adminComments || null,
       deadlines?.leDraftStart || null,
       deadlines?.leDraftEnd || null, deadlines?.ieCommentsStart || null, deadlines?.ieCommentsEnd || null,
       deadlines?.leCheckingStart || null, deadlines?.leCheckingEnd || null, deadlines?.sentToUpov || null,
       isPartialRevision || 'N',
       ...(status ? [status] : []),
       tgId]
    );

    await conn.execute(
      `UPDATE TG_Extended SET isMushroom = ? WHERE TG_ID = ?`,
      [isMushroom, tgId]
    );

    await conn.execute(`DELETE FROM TG_UPOVCode WHERE TG_ID = ?`, [tgId]);
    for (let i = 0; i < upovCodeIds.length; i++) {
      await conn.execute(
        `INSERT INTO TG_UPOVCode (TG_ID, UpovCode_ID, seqNumber) VALUES (?, ?, ?)`,
        [tgId, upovCodeIds[i], i + 1]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const createTg = async ({ reference, name, techWorkParty, languageCode, isMushroom, adminComments, upovCodeIds, sourceId, deadlines, archiveSource, isPartialRevision, targetStatus }) => {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Determine initial status.
    // All workflow copy-targets must be set directly; anything not in this list
    // defaults to CRT (the normal "just created" state for a brand-new wizard TG).
    const DIRECT_STATUSES = ['LED', 'TWD', 'TDD', 'TCD', 'ECC', 'ADT', 'ADC'];
    const initialStatus = DIRECT_STATUSES.includes(targetStatus) ? targetStatus : 'CRT';

    // Insert TG
    const [tgResult] = await conn.execute(
      `INSERT INTO TG (
        TG_Reference, TG_Name, Language_Code, Status_Code,
        CPI_Original, CPI_TechWorkParty,
        AdminComments, IsTGStatusOverride,
        isDisclaimerAccepted, isCharacteristicsLegend,
        TG_lastupdated, Created_Time
      ) VALUES (?, ?, 'EN', ?, ?, ?, ?, 'N', 'N', 'N', NOW(), NOW())`,
      [reference, name, initialStatus, languageCode, techWorkParty, adminComments || null]
    );
    const tgId = tgResult.insertId;

    // 2. Insert UPOV codes with sequence numbers
    for (let i = 0; i < upovCodeIds.length; i++) {
      await conn.execute(
        `INSERT INTO TG_UPOVCode (TG_ID, UpovCode_ID, seqNumber) VALUES (?, ?, ?)`,
        [tgId, upovCodeIds[i], i + 1]
      );
    }

    // 3. Insert TG_Extended (mushroom flag)
    await conn.execute(
      `INSERT INTO TG_Extended (TG_ID, isMushroom, Created_Time) VALUES (?, ?, NOW())`,
      [tgId, isMushroom]
    );

    // 3b. Set isPartialRevision if provided
    if (isPartialRevision) {
      await conn.execute(`UPDATE TG SET isPartialRevision = ? WHERE TG_ID = ?`, [isPartialRevision, tgId]);
    }

    // 4. Auto-assign users
    if (sourceId) {
      // 4a. Copy LE from source TG first
      await conn.execute(
        `INSERT INTO Tg_Users (TG_ID, User_ID, Role_Code, Status_Code, Language_Code)
         SELECT ?, tu.User_ID, tu.Role_Code, 'A', 'EN'
         FROM Tg_Users tu
         WHERE tu.TG_ID = ? AND tu.Role_Code = 'LE'`,
        [tgId, sourceId]
      );
    }
    // 4b. Auto-assign TWP users (excluding already assigned LE)
    if (techWorkParty && techWorkParty !== '-1') {
      await conn.execute(
        `INSERT INTO Tg_Users (TG_ID, User_ID, Role_Code, Status_Code, Language_Code)
         SELECT ?, up.User_ID, up.Role_Code, 'A', 'EN'
         FROM User_Profile up
         WHERE up.Status_Code = 'A'
           AND FIND_IN_SET(?, up.TWPS) > 0
           AND up.User_ID NOT IN (SELECT User_ID FROM Tg_Users WHERE TG_ID = ?)`,
        [tgId, techWorkParty, tgId]
      );
    }

    // 5. Set deadlines if provided
    if (deadlines) {
      // If targetStatus is LED and no leDraftStart set, default to today
      const leDraftStart = deadlines.leDraftStart || (initialStatus === 'LED' ? new Date().toISOString().slice(0, 10) : null);
      await conn.execute(
        `UPDATE TG SET
          LE_Draft_StartDate = ?,
          LE_Draft_EndDate = ?, IE_Comments_StartDate = ?, IE_Comments_EndDate = ?,
          LE_Checking_StartDate = ?, LE_Checking_EndDate = ?, Send_TO_UPOVDate = ?
        WHERE TG_ID = ?`,
        [leDraftStart, deadlines.leDraftEnd || null, deadlines.ieCommentsStart || null, deadlines.ieCommentsEnd || null,
         deadlines.leCheckingStart || null, deadlines.leCheckingEnd || null, deadlines.sentToUpov || null,
         tgId]
      );
    }

    // 6. Initialize chapter structure
    if (sourceId) {
      // Copy chapter content from source TG
      // Copy cover page fields from source TG to new TG
      await conn.execute(
        `UPDATE TG dest, TG src SET
          dest.Name_AssoDocInfo = src.Name_AssoDocInfo,
          dest.CharacteristicLegend = src.CharacteristicLegend,
          dest.isCharacteristicsLegend = src.isCharacteristicsLegend,
          dest.GroupingSummaryText = src.GroupingSummaryText,
          dest.ExampleVarietyText = src.ExampleVarietyText,
          dest.isExampleVarietyText = src.isExampleVarietyText,
          dest.ExplanationText = src.ExplanationText,
          dest.IS_GMO = src.IS_GMO,
          dest.USE_MT = src.USE_MT,
          dest.GMO_Method = src.GMO_Method,
          dest.MT_Method = src.MT_Method,
          dest.Exluding_UPOVCode = src.Exluding_UPOVCode,
          dest.Excluding_BotanicalName = src.Excluding_BotanicalName
        WHERE dest.TG_ID = ? AND src.TG_ID = ?`,
        [tgId, sourceId]
      );

      // Ch01 - Subject (1-to-many, includes paragraphs)
      await copyRows(conn, { table: 'TG_Sub_Add_Info', pk: 'Sub_Add_Id', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });

      // Ch02 - Material
      await copyRows(conn, { table: 'TG_Material', pk: 'Material_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });

      // Ch03 - Examination + propagation methods
      const examMappings = await copyRows(conn, { table: 'TG_Examination', pk: 'Examination_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });
      for (const m of examMappings) {
        await copyRows(conn, { table: 'ExaminationPropagationMethod', pk: 'ExaminationPropagationMethod_ID', fk: 'Examination_ID', oldFkVal: m.old, newFkVal: m.new });
      }

      // Ch04 - Assessment + propagation methods
      const assessMappings = await copyRows(conn, { table: 'TG_Assessment', pk: 'Assessment_Id', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });
      for (const m of assessMappings) {
        await copyRows(conn, { table: 'AssesmentMethodPropogation', pk: 'AssesmentMethodPropogation_ID', fk: 'Assessment_ID', oldFkVal: m.old, newFkVal: m.new });
      }

      // Ch06 - Additional Characteristics
      await copyRows(conn, { table: 'TG_AdditionalCharacteristics', pk: 'additionalChar_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });

      // Ch07 - Characteristics + expressions
      const charMappings = await copyRows(conn, { table: 'TG_Characteristics', pk: 'TOC_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });
      for (const m of charMappings) {
        // Copy expressions
        await copyRows(conn, { table: 'TOC_Expression_Notes', pk: 'Expression_Notes_ID', fk: 'TOC_ID', oldFkVal: m.old, newFkVal: m.new });
        // Copy explanations (ch08)
        const explMappings = await copyRows(conn, { table: 'TOC_Characteristic_Explanation', pk: 'Char_Explanation_ID', fk: 'TOC_ID', oldFkVal: m.old, newFkVal: m.new });
        // Copy explanation images
        for (const em of explMappings) {
          await copyRows(conn, { table: 'TOC_Explain_Indiv', pk: 'Indiv_Docs_ID', fk: 'Char_Explanation_ID', oldFkVal: em.old, newFkVal: em.new });
        }
      }

      // Ch09 - Literature
      await copyRows(conn, { table: 'TG_Literature', pk: 'Literature_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });

      // Ch10 - Technical Questionnaire
      const tqMappings = await copyRows(conn, { table: 'TG_TechQuestionaire', pk: 'TechQu_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });
      for (const m of tqMappings) {
        await copyRows(conn, { table: 'TqSubject', pk: 'TqSubjectID', fk: 'TechQu_ID', oldFkVal: m.old, newFkVal: m.new });
        await copyRows(conn, { table: 'TqBreedingScheme', pk: 'TqBreedingSchemeID', fk: 'TechQu_ID', oldFkVal: m.old, newFkVal: m.new });
        await copyRows(conn, { table: 'TqPropagationMethod', pk: 'TqPropagationMethodID', fk: 'TechQu_ID', oldFkVal: m.old, newFkVal: m.new });
        // TQ_Characteristics references TOC_ID which needs mapping
        const [tqChars] = await conn.execute(
          `SELECT * FROM TQ_Characteristics WHERE TechQu_ID = ?`, [m.old]
        );
        for (const tqc of tqChars) {
          const oldTqcId = tqc.TQ_CharacteristicsID;
          delete tqc.TQ_CharacteristicsID;
          tqc.TechQu_ID = m.new;
          // Map old TOC_ID to new TOC_ID
          const tocMapping = charMappings.find(cm => cm.old === tqc.TOC_ID);
          if (tocMapping) tqc.TOC_ID = tocMapping.new;
          if ('Modified_Time' in tqc) tqc.Modified_Time = null;
          if ('Created_Time' in tqc) tqc.Created_Time = new Date();
          const cols = Object.keys(tqc);
          const [result] = await conn.execute(
            `INSERT INTO TQ_Characteristics (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
            cols.map(c => tqc[c])
          );
          // Copy TQ_ExpressionNotes for this TQ_Characteristic
          await copyRows(conn, { table: 'TQ_ExpressionNotes', pk: 'TQ_ExpressionNotesID', fk: 'TQ_CharacteristicsID', oldFkVal: oldTqcId, newFkVal: result.insertId });
        }
      }

      // Ch11 - Annex
      await copyRows(conn, { table: 'TG_Annex', pk: 'Annex_ID', fk: 'TG_ID', oldFkVal: sourceId, newFkVal: tgId });

      // Archive source TG (default: yes, unless explicitly disabled)
      if (archiveSource !== false) {
        await conn.execute(
          `UPDATE TG SET Status_Code = 'ARC', TG_lastupdated = NOW() WHERE TG_ID = ?`,
          [sourceId]
        );
      }
    } else {
      // No source TG - initialize empty chapter records so frontend always has data
      // Ch01 - Subject (main row)
      await conn.execute(
        `INSERT INTO TG_Sub_Add_Info (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch02 - Material
      await conn.execute(
        `INSERT INTO TG_Material (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch03 - Examination
      await conn.execute(
        `INSERT INTO TG_Examination (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch04 - Assessment
      await conn.execute(
        `INSERT INTO TG_Assessment (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch06 - Additional Characteristics
      await conn.execute(
        `INSERT INTO TG_AdditionalCharacteristics (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch09 - Literature
      await conn.execute(
        `INSERT INTO TG_Literature (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch10 - Technical Questionnaire
      await conn.execute(
        `INSERT INTO TG_TechQuestionaire (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );

      // Ch11 - Annex
      await conn.execute(
        `INSERT INTO TG_Annex (TG_ID, Created_Time) VALUES (?, NOW())`,
        [tgId]
      );
    }

    await conn.commit();
    return tgId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};