import { queryOne } from '../../utils/db.js';
import { findByUsername } from '../../repositories/user.js';
import { getPermission } from '../../config/permissions.js';
import { stripHtml } from '../../utils/html.js';
import {
  findTgHeader,
  findUpovCodes,
  findChapter01,
  findChapter02,
  findChapter03,
  findChapter04,
  findChapter06,
  findCharacteristics,
  findExplanations,
  findChapter09,
  findChapter10,
  findTqSubjects,
  findTqBreedingSchemes,
  findTqPropagationMethods,
  findTqCharacteristics,
  findChapter11,
  findParagraphs,
  findExamPropMethods,
  findAssessmentPropMethods,
  findExpressionTypes,
  findObservationMethods,
  findBreedingSchemeMethods,
  findPropagationMethodTypes,
} from '../../repositories/chapters/edit.repo.js';
import { findUsersByTgId } from '../../repositories/test-guideline.js';

/**
 * GET /api/test-guidelines/:id/open
 * Load all chapter data and resolve canEdit based on user role.
 *
 * - LE for this TG or Admin → { canEdit: true, ...data }
 * - IE for this TG           → { canEdit: false, ...data }
 * - Anyone else               → 403
 */
export const open = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);

    if (!tgId || isNaN(tgId)) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } },
        400
      );
    }

    // Load TG header first — bail early if not found
    const tg = await findTgHeader(tgId);
    if (!tg) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Test guideline not found' } },
        404
      );
    }

    // Resolve user role for this TG
    const authUser = c.get('user');
    const dbUser = await findByUsername(authUser.sub);
    if (!dbUser) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'User not found in the system' } },
        403
      );
    }

    let canEdit = false;

    if (dbUser.roleCode === 'ADM') {
      canEdit = true;
    } else {
      const tgRole = await queryOne(
        `SELECT Role_Code FROM Tg_Users WHERE User_ID = ? AND TG_ID = ?`,
        [dbUser.id, tgId]
      );

      if (!tgRole) {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'You are not assigned to this test guideline' } },
          403
        );
      }

      canEdit = tgRole.Role_Code === 'LE';
    }

    // Resolve status-aware permission
    const isLE = !!(canEdit && dbUser.roleCode !== 'ADM');
    const userRole = dbUser.roleCode === 'ADM' ? 'ADM' : isLE ? 'LE' : 'IE';
    const permission = getPermission(tg.Status_Code, tg.CPI_TechWorkParty, userRole);

    // Build the header response
    const tgHeader = {
      TG_ID: tg.TG_ID,
      TG_Reference: tg.TG_Reference,
      TG_Name: tg.TG_Name,
      Status_Code: tg.Status_Code,
      Language_Code: tg.Language_Code,
      isMushroom: tg.isMushroom === 'Y',
      LE_Draft_StartDate: tg.LE_Draft_StartDate,
      LE_Draft_EndDate: tg.LE_Draft_EndDate,
      IE_Comments_StartDate: tg.IE_Comments_StartDate,
      IE_Comments_EndDate: tg.IE_Comments_EndDate,
      LE_Checking_StartDate: tg.LE_Checking_StartDate,
      LE_Checking_EndDate: tg.LE_Checking_EndDate,
      AdminComments: tg.AdminComments,
      TG_lastupdated: tg.TG_lastupdated,
      Name_AssoDocInfo: tg.Name_AssoDocInfo,
      GroupingSummaryText: tg.GroupingSummaryText,
    };

    // Load all chapter data in parallel
    const [
      upovCodes,
      users,
      ch01,
      ch02,
      ch03,
      ch04,
      ch06,
      characteristics,
      explanations,
      ch09,
      ch10Raw,
      ch11,
      paragraphs,
      examPropMethods,
      assessmentPropMethods,
      expressionTypes,
      observationMethods,
      breedingSchemeMethods,
      propagationMethodTypes,
    ] = await Promise.all([
      findUpovCodes(tgId),
      findUsersByTgId(tgId),
      findChapter01(tgId),
      findChapter02(tgId),
      findChapter03(tgId),
      findChapter04(tgId),
      findChapter06(tgId),
      findCharacteristics(tgId),
      findExplanations(tgId),
      findChapter09(tgId),
      findChapter10(tgId),
      findChapter11(tgId),
      findParagraphs(tgId),
      findExamPropMethods(tgId),
      findAssessmentPropMethods(tgId),
      findExpressionTypes(),
      findObservationMethods(),
      findBreedingSchemeMethods(),
      findPropagationMethodTypes(),
    ]);

    // Build ch10 with sub-entities
    let ch10 = ch10Raw || null;
    if (ch10Raw && ch10Raw.TechQu_ID) {
      const [subjects, breedingSchemes, propagationMethods, tqChars] = await Promise.all([
        findTqSubjects(ch10Raw.TechQu_ID),
        findTqBreedingSchemes(ch10Raw.TechQu_ID),
        findTqPropagationMethods(ch10Raw.TechQu_ID),
        findTqCharacteristics(ch10Raw.TechQu_ID),
      ]);
      ch10 = {
        ...ch10Raw,
        subjects,
        breedingSchemes,
        propagationMethods,
        characteristics: tqChars,
      };
    }

    // Strip HTML from characteristic names (Chapter 07)
    const cleanedCharacteristics = characteristics.map(char => ({
      ...char,
      TOC_Name: stripHtml(char.TOC_Name),
      expressions: char.expressions?.map(expr => ({
        ...expr,
        State_of_Expression: stripHtml(expr.State_of_Expression),
      })) || [],
    }));

    // Keep HTML in explanations (Chapter 08) - they contain rich text with images
    const cleanedExplanations = explanations;

    // Strip HTML from Chapter 10 fields
    let cleanedCh10 = ch10;
    if (ch10) {
      cleanedCh10 = {
        ...ch10,
        BreedingSchemeInfo: stripHtml(ch10.BreedingSchemeInfo),
        ProdSchemeInfo: stripHtml(ch10.ProdSchemeInfo),
        VirusPresenceInfo: stripHtml(ch10.VirusPresenceInfo),
        ExaminationAddInfo: stripHtml(ch10.ExaminationAddInfo),
        subjects: ch10.subjects?.map(subj => ({
          ...subj,
          TqBotanicalName: stripHtml(subj.TqBotanicalName),
          TqCommonName: stripHtml(subj.TqCommonName),
        })) || [],
        breedingSchemes: ch10.breedingSchemes?.map(bs => ({
          ...bs,
          TqBreedingSChemeOtherDetails: stripHtml(bs.TqBreedingSChemeOtherDetails),
        })) || [],
        propagationMethods: ch10.propagationMethods?.map(pm => ({
          ...pm,
          TqPMethodOtherDetails: stripHtml(pm.TqPMethodOtherDetails),
        })) || [],
        characteristics: ch10.characteristics?.map(char => ({
          ...char,
          Name: stripHtml(char.Name),
        })) || [],
      };
    }

    // Build chapters object
    const chapters = {
      '00': {
        TG_Name: tg.TG_Name,
        Name_AssoDocInfo: tg.Name_AssoDocInfo,
      },
      '01': ch01 || null,
      '02': ch02 || null,
      '03': ch03 || null,
      '04': ch04 || null,
      '05': { GroupingSummaryText: tg.GroupingSummaryText },
      '06': {
        isCharacteristicsLegend: tg.isCharacteristicsLegend,
        CharacteristicLegend: tg.CharacteristicLegend,
        isExampleVarietyText: tg.isExampleVarietyText,
        ExampleVarietyText: tg.ExampleVarietyText,
        additionalCharacteristics: ch06 || null,
      },
      '07': {
        characteristics: cleanedCharacteristics,
      },
      '08': {
        explanations: cleanedExplanations,
      },
      '09': ch09 || null,
      '10': cleanedCh10,
      '11': ch11 || null,
    };

    // ASW seed quality options (hardcoded — these are fixed in the UPOV standard)
    const aswSeedQuality = [
      { code: 'ASW1(a)', label: 'Seed-only, with storage clause' },
      { code: 'ASW1(b)', label: 'Seed-only, without storage clause' },
      { code: 'ASW2(a)', label: 'Mixed, with storage clause' },
      { code: 'ASW2(b)', label: 'Mixed, without storage clause' },
    ];

    const plotDesigns = [
      { code: 'Singleplot', label: 'Single plot' },
      { code: 'OneRepplot', label: 'Replicated plot' },
      { code: 'Diffplot', label: 'Different plot types' },
    ];

    return c.json({
      canEdit,
      permission,
      tg: { ...tgHeader, users },
      upovCodes,
      chapters,
      paragraphs,
      propagationMethods: {
        examination: examPropMethods,
        assessment: assessmentPropMethods,
      },
      lookups: {
        aswOptions: { seedQuality: aswSeedQuality },
        expressionTypes,
        observationMethods,
        plotDesigns,
        breedingSchemeMethods,
        propagationMethodTypes,
      },
    });
  } catch (err) {
    console.error('Load editor error:', err);
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to load editor data' } },
      500
    );
  }
};
