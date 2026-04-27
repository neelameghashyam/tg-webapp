import { query, updateTgTimestamp } from '../../utils/db.js';

const ALLOWED_FIELDS = ['GroupingSummaryText'];

/**
 * Fetch all grouping characteristics for a TG
 */
export const fetchGroupingCharacteristics = async (tgId, languageCode = 'EN') => {
  const sql = `
    SELECT 
      tc.TOC_ID as tocID,
      tc.CharacteristicOrder as characteristicsOrder,
      tc.TOC_Name as characteristicsName,
      tc.GroupingText as groupingText,
      tc.Grouping as grouping
    FROM TG_Characteristics tc
    WHERE tc.TG_ID = ?
      AND tc.Status_Code != 'DEL'
      AND tc.Grouping = 'Y'
    ORDER BY tc.CharacteristicOrder
  `;
  
  const characteristics = await query(sql, [tgId]);
  
  // If not English, fetch translations
  if (languageCode !== 'EN') {
    const translationSql = `
      SELECT 
        TocId,
        FieldValue as characteristicsName,
        GroupingText as groupingText
      FROM TocCharacteristicsTranslation
      WHERE TgId = ? 
        AND LanguageCode = ?
        AND FieldDesc = 'CHAR'
    `;
    
    const translations = await query(translationSql, [tgId, languageCode]);
    const translationMap = new Map(translations.map(t => [t.TocId, t]));
    
    // Merge translations with characteristics
    characteristics.forEach(char => {
      const translation = translationMap.get(char.tocID);
      if (translation) {
        if (translation.characteristicsName) {
          char.characteristicsName = translation.characteristicsName;
        }
        if (translation.groupingText) {
          char.groupingText = translation.groupingText;
        }
      }
    });
  }
  
  return characteristics;
};

/**
 * Fetch grouping summary text from TG table
 */
export const fetchGroupingSummary = async (tgId, languageCode = 'EN') => {
  // First get from main TG table
  const tgSql = `
    SELECT GroupingSummaryText 
    FROM TG 
    WHERE TG_ID = ? AND Status_Code != 'DEL'
  `;
  
  const [tgData] = await query(tgSql, [tgId]);
  let groupingSummaryText = tgData?.GroupingSummaryText || '';
  
  // If not English, try to get translation
  if (languageCode !== 'EN') {
    const translationSql = `
      SELECT GroupingSummaryText 
      FROM TgTranslation 
      WHERE TgId = ? AND LanguageCode = ?
    `;
    
    const [translation] = await query(translationSql, [tgId, languageCode]);
    if (translation?.GroupingSummaryText) {
      groupingSummaryText = translation.GroupingSummaryText;
    }
  }
  
  return groupingSummaryText;
};

/**
 * Save grouping text for multiple characteristics
 */
export const saveGroupingTexts = async (tgId, groupingData, languageCode = 'EN', userRole = 'DRF') => {
  const results = [];
  
  for (const item of groupingData) {
    if (item.tocID === 0 || item.tocID === '0') {
      // This is the summary text
      if (languageCode === 'EN' || userRole !== 'TRN') {
        const result = await query(
          `UPDATE TG SET GroupingSummaryText = ? WHERE TG_ID = ?`,
          [item.groupingText, tgId]
        );
        if (result.affectedRows > 0) {
          await updateTgTimestamp(tgId);
        }
      } else {
        // Save to translation table
        await query(
          `INSERT INTO TgTranslation (TgId, LanguageCode, GroupingSummaryText, LastUpdated)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
             GroupingSummaryText = VALUES(GroupingSummaryText),
             LastUpdated = NOW()`,
          [tgId, languageCode, item.groupingText]
        );
      }
    } else {
      // Update individual characteristic grouping text
      if (languageCode === 'EN' || userRole !== 'TRN') {
        const result = await query(
          `UPDATE TG_Characteristics 
           SET GroupingText = ? 
           WHERE TOC_ID = ? AND TG_ID = ?`,
          [item.groupingText, item.tocID, tgId]
        );
        if (result.affectedRows > 0) {
          await updateTgTimestamp(tgId);
        }
      } else {
        // Save to translation table
        await query(
          `INSERT INTO TocCharacteristicsTranslation 
           (TocId, TgId, LanguageCode, GroupingText, FieldDesc, LastUpdated)
           VALUES (?, ?, ?, ?, 'CHAR', NOW())
           ON DUPLICATE KEY UPDATE 
             GroupingText = VALUES(GroupingText),
             LastUpdated = NOW()`,
          [item.tocID, tgId, languageCode, item.groupingText]
        );
      }
      results.push({ tocID: item.tocID, success: true });
    }
  }
  
  return results;
};

/**
 * Update the grouping summary text on the TG row
 */
export const updateChapter05 = async (tgId, updates) => {
  const fields = Object.keys(updates).filter((f) => ALLOWED_FIELDS.includes(f));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => updates[f]);
  
  const result = await query(
    `UPDATE TG SET ${setClauses} WHERE TG_ID = ? AND Status_Code != 'DEL'`,
    [...values, tgId]
  );
  
  // Update timestamp on successful update
  if (result.affectedRows > 0) {
    await updateTgTimestamp(tgId);
  }
  
  return result.affectedRows > 0;
};

export { ALLOWED_FIELDS };