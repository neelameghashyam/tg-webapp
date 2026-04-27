# TG Document Template with Pseudo-Conditions

This document represents the full structure of a generated Test Guidelines Word document,
with all conditional content annotated inline using `[IF ...]` / `[END IF]` markers.

**Data sources:** DB = database field, LABEL = i18n label key, TEMPLATE = Word template placeholder

---

## COVER PAGE *(from Word template)*

> The cover page comes from a pre-built `.docx` template. Placeholders are replaced at generation time.

[IF status == "ADT" (Adopted)]
  *Template:* adopted template (e.g., `TGP_template_cover_page_adopted.docx`)
  *Date:* `${HEADER-DATE}` = TG_AdoptionDate
[ELSE]
  *Template:* standard template (e.g., `TGP_template_cover_page.docx`)
  *Date:* `${HEADER-DATE}` = reportDate parameter (or today if not provided)
[END IF]

[IF lang == "fr"]
  *Template variant:* `TGP_template_cover_page_FR.docx`
[ELSE IF lang == "de"]
  *Template variant:* `TGP_template_cover_page_DE.docx`
[ELSE IF lang == "es"]
  *Template variant:* `TGP_template_cover_page_ES.docx`
[ELSE]
  *Template variant:* `TGP_template_cover_page.docx` (English default)
[END IF]

### Template Placeholder Replacements

- `${TGREF-ID}` → DB: TG_Reference
- `${TG-LANG}` → "English" (only set when Language_Code == "EN")
- `${MAIN-COMMON-NAME}` → DB: TG_Name (UPPERCASED)
- `${CPI_DRAFTING_COUNTRY}` → DB: Cpi_DraftingCountry
- `${CPI_TOBEHELDIN}` → DB: CPI_Tobeheldin

### Associated Documents

[IF Name_AssoDocInfo is not empty]
  `${Associated_Documents_Label}` → "Other associated UPOV documents"
  `${Associated_Documents}` → DB: Name_AssoDocInfo (rendered as HTML)
[ELSE]
  *Both `${Associated_Documents}` and `${Associated_Documents_Label}` paragraphs are removed entirely from the document.*
[END IF]

### UPOV Codes

[IF UPOV_CODES is not null]
  `${UPOV-CODE}` → DB: UPOV_CODES (cleaned, semicolons spaced)
[ELSE]
  `${UPOV-CODE}` → "" (empty)
[END IF]

[IF Exclude_UPOV_CODE_COMMENTS is not null AND != "Add comment,  if appropriate"]
  `${EXCLUDE_UPOV_CODES}` → DB: Exclude_UPOV_CODE_COMMENTS (parsed as text)
[ELSE]
  *`${EXCLUDE_UPOV_CODES}` paragraph content is removed.*
[END IF]

### Botanical Names

[IF title1 (botanical names) is not null]
  `${BotanicalName}` → DB: title1 (HTML, centered)
[ELSE]
  `${BotanicalName}` → "" (empty)
[END IF]

[IF Exlude_Botanical_Names_COMMENTS is not null and not empty]
  `${EXCLUDE_BOTANICAL_NAME}` → DB: Exlude_Botanical_Names_COMMENTS (HTML)
[ELSE]
  `${EXCLUDE_BOTANICAL_NAME}` → "" (empty)
[END IF]

### CPI Details

- `${technical_working_party}` → DB: TB_Desc
- `${cpi_altis}` → DB: CPI_AtIts
- `${cpi_date_from}` → DB: CPI_DateFrom
- `${cpi_date_to}` → DB: CPI_DateTo

### Alternative Botanical Names Table

[IF botanicalNamesList is not empty]
  **Table:** Alternative botanical names (columns: Botanical name | English | French | German | Spanish)

  *For each botanical name entry:*
  [IF en_botanical_name is not null and not "Enter..."] → English column populated
  [IF fr_botanical_name is not null and not "Enter..."] → French column populated
  [IF de_botanical_name is not null and not "Enter..."] → German column populated
  [IF es_botanical_name is not null and not "Enter..."] → Spanish column populated

  *Page break inserted after table.*
[ELSE]
  *No alternative botanical names table. No page break.*
[END IF]

### Table of Contents

[IF lang == "fr"]
  TABLE OF CONTENTS (with French tab spacing)
[ELSE]
  TABLE OF CONTENTS (with standard tab spacing)
[END IF]

PAGE

*Auto-generated TOC from heading levels 1-3*

---

*Page break*

---

## 1. Subject of these Test Guidelines

[IF botanicalNames is not empty]
  [IF subDDValue or subSpicesCategory is not empty → use sub-numbering]
    **1.1** These Test Guidelines apply to all varieties of *{botanicalNames}*.
  [ELSE]
    These Test Guidelines apply to all varieties of *{botanicalNames}*.
  [END IF]

  [IF Sub_OtherInfo is not empty AND does not contain "Sentence"]
    *(appended to same paragraph)* {Sub_OtherInfo}
  [END IF]

  *(period appended if text doesn't already end with one)*
[END IF]

[IF SubjectSpeciesCategory is not empty]
  **1.{n}** Guidance on the use of Test Guidelines for {SubjectSpeciesCategory} that are not explicitly covered by Test Guidelines is provided in document TGP/13 "Guidance for New Types and Species".
[END IF]

[IF Sub_DD_Value is not empty]
  **1.{n}** In the case of {Sub_DD_Value} varieties, in particular, it may be necessary to use additional characteristics or additional states of expression to those included in the Table of Characteristics in order to examine Distinctness, Uniformity and Stability.
[END IF]

> *Sub-section numbering (1.1, 1.2, 1.3) is dynamically computed based on which of the above conditions are true.*

---

## 2. Material Required

[IF isMushroom != "N"]
  *All references to "plant material" become "material" throughout this section.*
[END IF]

**2.1** The competent authorities decide on the quantity and quality of the {material} required for testing the variety and when and where it is to be delivered. Applicants submitting material from a State other than that in which the testing takes place must ensure that all customs formalities and phytosanitary requirements are complied with.

[IF materialSupplied (from DB) is not empty]
  **2.2** The material is to be supplied in the form of {materialSupplied}.
[END IF]

[IF minPlatMaterial is not empty]
  **2.3** The minimum quantity of {material}, to be supplied by the applicant, should be: {minPlatMaterial}
[END IF]

[IF seedQualityReq is not empty]
  [IF seedQualityReq == "ASW1(a)"]
    The seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority. In cases where the seed is to be stored, the germination capacity should be as high as possible and should be, stated by the applicant.
  [ELSE IF seedQualityReq == "ASW2(a)"]
    In the case of seed, the seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority. In cases where the seed is to be stored, the germination capacity should be as high as possible and should be stated by the applicant.
  [ELSE IF seedQualityReq == "ASW1(b)"]
    The seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority.
  [ELSE IF seedQualityReq == "ASW2(b)"]
    In the case of seed, the seed should meet the minimum requirements for germination, species and analytical purity, health and moisture content, specified by the competent authority.
  [END IF]
[END IF]

[IF materialAddInfo is not empty]
  *(Additional material information paragraph — rendered as HTML)*
[END IF]

**2.4** The {material} supplied should be visibly healthy, not lacking in vigor, nor affected by any important pest or disease.

**2.5** The {material} should not have undergone any treatment which would affect the expression of the characteristics of the variety, unless the competent authorities allow or request such treatment. If it has been treated, full details of the treatment must be given.

---

## 3. Method of Examination

### 3.1 Number of Growing Cycles

> *Sub-numbering within 3.1 is dynamic. A counter starts at 1 and increments for each condition that is true. If NONE of the sub-conditions below are true, the content under 3.1 has no sub-index.*

[IF growingCycle == "Single" OR "Two" OR plantingForm is set OR otherGrowingCycleInfo is set OR cropType is set]
  *Sub-numbering is activated (3.1.1, 3.1.2, ...)*
[END IF]

[IF growingCycle is not empty]
  [IF growingCycle == "Single"]
    **3.1.{n}** The minimum duration of tests should normally be a single growing cycle.
  [ELSE IF growingCycle == "Two"]
    **3.1.{n}** The minimum duration of tests should normally be two independent growing cycles.
  [END IF]
[END IF]

[IF plantingForm is not empty]
  [IF plantingForm == "from a single planting"]
    **3.1.{n}** The two independent growing cycles may be observed from a single planting, examined in two separate growing cycles.
  [ELSE IF plantingForm == "in the form of two separate plantings"]
    **3.1.{n}** The two independent growing cycles should be in the form of two separate plantings.
  [END IF]
[END IF]

[IF otherGrowingCycleInfo is not empty]
  **3.1.{n}** {otherGrowingCycleInfo} *(rendered as HTML)*
[END IF]

[IF cropType OR cropTypeOtherInfo is not empty]
  **3.1.{n}** In particular, it is essential that the {cropType or cropTypeOtherInfo} produce a satisfactory crop of fruit in each of the two growing cycles.
[END IF]

[IF fruitDormantPeriod is set]
  [IF fruitDormantPeriod == "Defined"]
    **3.1.{n}** The growing cycle is considered to be the duration of a single growing season, beginning with the dormancy period, followed by bud burst (flowering and/or vegetative), flowering and fruit harvest and concluding when the following dormant period starts.
  [ELSE IF fruitDormantPeriod == "Not defined"]
    **3.1.{n}** The growing cycle is considered to be the period ranging from the beginning of active vegetative growth or flowering, continuing through active vegetative growth or flowering and fruit development and concluding with the harvesting of fruit.
  [ELSE IF fruitDormantPeriod == "Evergreen"]
    **3.1.{n}** The growing cycle is considered to be the period ranging from the beginning of development of an individual flower or inflorescence, through fruit development and concluding with the harvesting of fruit from the corresponding individual flower or inflorescence.
  [END IF]
[END IF]

[IF growingCycleAdditionalInfo is not empty]
  **3.1.{n}** {growingCycleAdditionalInfo} *(parsed from HTML)*
[END IF]

**3.1.{n}** The testing of a variety may be concluded when the competent authority can determine with certainty the outcome of the test.

### 3.2 Testing Place

Tests are normally conducted at one place. In the case of tests conducted at more than one place, guidance is provided in TGP/9 "Examining Distinctness".

### 3.3 Conditions for Conducting the Examination

> *Sub-numbering within 3.3 is dynamic. If only ONE of the conditions below is true, no sub-index is used (single paragraph mode).*

[IF multiple conditions true among: devlopmentstage, plotTypeA-D, eyeColorObservation]
  *Sub-numbering activated (3.3.1, 3.3.2, ...)*
[END IF]

**3.3.{n}** The tests should be carried out under conditions ensuring satisfactory growth for the expression of the relevant characteristics of the variety and for the conduct of the examination.

[IF devlopmentstage == "Y"]
  **3.3.{n}** The optimum stage of development for the assessment of each characteristic is indicated by a reference in the Table of Characteristics. The stages of development denoted by each reference are described in Chapter 8.
[END IF]

[IF plotTypeA is valid (not empty, not placeholder text)]
  **3.3.{n}** The recommended type of plot in which to observe the characteristic is indicated by the following key in the Table of Characteristics.
  A: {plotTypeA}
[END IF]

[IF plotTypeB is valid]
  B: {plotTypeB}
[END IF]

[IF plotTypeC is valid]
  C: {plotTypeC}
[END IF]

[IF plotTypeD is valid]
  D: {plotTypeD}
[END IF]

> *"Valid" means: not null, not empty, and not a placeholder like "Add Type of plot" in any language.*

[IF eyeColorObservation == "Y"]
  **3.3.{n}** Because daylight varies, color determinations made against a color chart should be made either in a suitable cabinet providing artificial daylight or in the middle of the day in a room without direct sunlight. The spectral distribution of the illuminant for artificial daylight should conform with the CIE Standard of Preferred Daylight D 6500 and should fall within the tolerances set out in the British Standard 950, Part I. These determinations should be made with the plant part placed against a white background. The color chart and version used should be specified in the variety description.
[END IF]

[IF conditionAddInfo is not empty]
  **3.3.{n}** {conditionAddInfo} *(rendered as HTML)*
[END IF]

### 3.4 Test Design

> *Sub-numbering within 3.4 depends on propagation method count and other flags.*

[IF only 1 propagation method AND plantRemoval != "Y" AND testDesignAddInfo is empty]
  *Single paragraph mode — no sub-index numbers.*
[ELSE]
  *Sub-numbering activated (3.4.1, 3.4.2, ...)*
[END IF]

*For each propagation method entry:*

[IF examinationPlotDesign == "Diffplot"]
  [IF hasAtLeastTwoFilled(plantNumberA, plantNumberB, plantNumberC, plantNumberD)]
    *Multiple plant number paragraphs with sub-indices (a), (b), (c), (d):*

    [IF propagationMethod is not empty and not "undefined"]
      [IF lang == "fr" AND propagationMethod starts with vowel/h]
        In the case of {propagationMethod} (French vowel form)...
      [ELSE]
        In the case of {propagationMethod}...
      [END IF]

      [IF isMushroom != "N"]
        ...test should be designed to result in a total of at least {plantNumber} fruit bodies or parts of fruit bodies...
      [ELSE]
        ...test should be designed to result in a total of at least {plantNumber} plants or parts of plants...
      [END IF]

      ...which should be divided between at least {replicates} replicates.
    [END IF]
  [ELSE]
    *Single plant number — simpler paragraph without letter indices.*
  [END IF]

[ELSE IF examinationPlotDesign == "Singleplot"]
  [IF propagationMethod flag is set]
    Each test should be designed to result in a total of at least {plantNumber} {plants or fruit bodies}.
  [END IF]

[ELSE IF examinationPlotDesign == "OneRepplot"]
  [IF propagationMethod flag is set]
    Each test should be designed to result in a total of at least {plantNumber} {plants or fruit bodies}, which should be divided between at least {replicates} replicates.
  [END IF]
[END IF]

[IF plantRemoval == "Y"]
  **3.4.{n}** The design of the tests should be such that {plants or fruit bodies} may be removed for measurement or counting without prejudice to the observations which must be made up to the end of the growing cycle.
[END IF]

[IF testDesignAddInfo is not empty]
  **3.4.{n}** {testDesignAddInfo} *(rendered as HTML)*
[END IF]

---

## 4. Assessment of Distinctness, Uniformity and Stability

### 4.1 Distinctness

**4.1.1** General Recommendations

It is of particular importance for users of these Test Guidelines to consult the General Introduction prior to making decisions regarding distinctness. However, the following points are provided for elaboration or emphasis in these Test Guidelines.

[IF distinctnessHybridAddInfo is not empty]
  *(Additional distinctness info for hybrids — rendered as HTML)*
[END IF]

[IF IsHybridParentFormula == "Y"]
  To assess distinctness of hybrids, the parent lines and the formula may be used according to the following recommendations:
  (i) description of parent lines according to the Test Guidelines;
  (ii) check of the originality of the parent lines in comparison with the variety collection, based on the characteristics in Chapter 7, in order to identify similar parent lines;
  (iii) check of the originality of the hybrid formula in relation to the hybrids in the variety collection, taking into account the most similar lines; and
  (iv) assessment of the distinctness at the hybrid level for varieties with a similar formula.
  Further guidance is provided in documents TGP/9 "Examining Distinctness" and TGP/8 "Trial Design and Techniques Used in the Examination of Distinctness, Uniformity and Stability".
[END IF]

**4.1.2** Consistent Differences

The differences observed between varieties may be so clear that more than one growing cycle is not necessary. In addition, in some circumstances, the influence of the environment is not such that more than a single growing cycle is required to provide assurance that the differences observed between varieties are sufficiently consistent. One means of ensuring that a difference in a characteristic, observed in a growing trial, is sufficiently consistent is to examine the characteristic in at least two independent growing cycles.

**4.1.3** Clear Differences

Determining whether a difference between two varieties is clear depends on many factors, and should consider, in particular, the type of expression of the characteristic being examined, i.e. whether it is expressed in a qualitative, quantitative, or pseudo-qualitative manner. Therefore, it is important that users of these Test Guidelines are familiar with the recommendations contained in the General Introduction prior to making decisions regarding distinctness.

**4.1.4** Number of {plants/fruit bodies} to be Examined

[IF isMushroom == "N"] → "Plants or Parts of Plants"
[ELSE] → "Fruit Bodies or Parts of Fruit Bodies"
[END IF]

[IF IsOneMethodOfPropogation != "Y"]
  [IF isMushroom == "N"]
    Unless otherwise indicated, for the purposes of distinctness, all observations on single plants should be made on {singlePlant1} plants or parts taken from each of {singlePlant2} plants and any other observations made on all {singlePlant1} in the test, disregarding any off-type plants.
  [ELSE]
    Unless otherwise indicated, for the purposes of distinctness, all observations on single fruit bodies should be made on {singlePlant1} fruit bodies or parts taken from each of {singlePlant2} fruit bodies and any other observations made on all fruit bodies in the test, disregarding any off-type fruit bodies.
  [END IF]
[END IF]

[IF partsPlant > 0]
  [IF isMushroom == "N"]
    In the case of observations of parts taken from single plants, the number of parts to be taken from each of the plants should be {partsPlant}
  [ELSE]
    In the case of observations of parts taken from single fruit bodies, the number of parts to be taken from each of the fruit bodies should be {partsPlant}
  [END IF]
[END IF]

*For each propagation method entry (from DB query):*

[IF propagationMethod is not empty]
  [IF lang == "fr" AND propagationMethod starts with vowel/h]
    In the case of {propagationMethod} *(French vowel form)*
  [ELSE]
    In the case of {propagationMethod}
  [END IF]

  [IF isMushroom == "N"]
    ...{unless otherwise}, indicated, for the purposes of distinctness, all observations on single plants should be made on {plant1} plants or parts taken from each of {plant2} plants...
  [ELSE]
    ...{unless otherwise}, indicated, for the purposes of distinctness, all observations on single fruit bodies should be made on {plant1} fruit bodies...
  [END IF]
[END IF]

[IF isPartsOfSinglePlants == "Y"]
  [IF lang == "de" AND numberOfPartsOfPlants != "1"]
    *(German plural variant)* In the case of observations of parts taken from single plants, the number of parts... should be {numberOfPartsOfPlants}.
  [ELSE]
    In the case of observations of parts taken from single plants, the number of parts to be taken from each of the plants should be {numberOfPartsOfPlants}.
  [END IF]
[END IF]

[IF distinctnessAddInfo is not empty]
  **4.1.5** {distinctnessAddInfo} *(rendered as HTML)*
  *(Next paragraph becomes 4.1.6 instead of 4.1.5)*
[END IF]

**4.1.{5 or 6}** Method of Observation

The recommended method of observing the characteristic for the purposes of distinctness is indicated by the following key in the Table of Characteristics (see document TGP/9 "Examining Distinctness", Section 4 "Observation of characteristics"):

[IF isMushroom == "N"]
  MG: single measurement of a group of plants or parts of plants
  MS: measurement of a number of individual plants or parts of plants
  VG: visual assessment by a single observation of a group of plants or parts of plants
  VS: visual assessment by observation of individual plants or parts of plants
[ELSE]
  MG: single measurement of a group of fruit bodies or parts of fruit bodies
  MS: measurement of a number of individual fruit bodies or parts of fruit bodies
  VG: visual assessment by a single observation of a group of fruit bodies or parts of fruit bodies
  VS: visual assessment by observation of individual fruit bodies or parts of fruit bodies
[END IF]

Type of observation: visual (V) or measurement (M)

"Visual" observation (V) is an observation made on the basis of the expert's judgment...

[IF isMushroom == "N"]
  Type of record: for a group of plants (G) or for single, individual plants (S)
  For the purposes of distinctness, observations may be recorded as a single record for a group of plants or parts of plants (G)...
[ELSE]
  Type of record: for a group of fruit bodies (G) or for single, individual fruit bodies (S)
  For the purposes of distinctness, observations may be recorded as a single record for a group of fruit bodies or parts of fruit bodies (G)...
[END IF]

In cases where more than one method of observing the characteristic is indicated in the Table of Characteristics (e.g. VG/MG), guidance on selecting an appropriate method is provided in document TGP/9, Section 4.2.

### 4.2 Uniformity

> *Sub-numbering within 4.2 is fully dynamic — a counter starts at 2 and increments for each condition.*

**4.2.1** It is of particular importance for users of these Test Guidelines to consult the General Introduction prior to making decisions regarding uniformity. However, the following points are provided for elaboration or emphasis in these Test Guidelines:

[IF typeOfPropagation OR otherTypeOfPropagation is not empty]
  **4.2.{n}** These Test Guidelines have been developed for the examination of {typeOfPropagation}. For varieties with other types of propagation, the recommendations in the General Introduction and document TGP/13 "Guidance for new types and species" Section 4.5 "Testing Uniformity" should be followed.
[END IF]

[IF crossPolinattedVarieties == "crosspollinatedonly"]
  **4.2.{n}** The assessment of uniformity should be according to the recommendations for cross-pollinated varieties in the General Introduction.
[END IF]

[IF crossPolinattedVarieties == "crosspollinatedwithotherpropagation"]
  **4.2.{n}** The assessment of uniformity for {typesOfVariety or otherTypesOfVariety} should be according to the recommendations for cross-pollinated varieties in the General Introduction.
[END IF]

[IF uniformityCrossPollinatedAddInfo is not empty]
  **4.2.{n}** {uniformityCrossPollinatedAddInfo} *(rendered as HTML)*
[END IF]

[IF IsHybridVariety == "Y"]
  **4.2.{n}** The assessment of uniformity for hybrid varieties depends on the type of hybrid and should be according to the recommendations for hybrid varieties in the General Introduction.
[END IF]

[IF uniformityHybridAddInfo is not empty]
  **4.2.{n}** {uniformityHybridAddInfo} *(rendered as HTML)*
[END IF]

[IF UniformityAssessmentParentFormula == "Y"]
  **4.2.{n}** Where the assessment of a hybrid variety involves the parent lines, the uniformity of the hybrid variety should, in addition to an examination of the hybrid variety itself, also be assessed by examination of the uniformity of its parent lines.
[END IF]

[IF uniformityParentFormulaAddInfo is not empty]
  **4.2.{n}** {uniformityParentFormulaAddInfo} *(rendered as HTML)*
[END IF]

[IF UniformityAssessmentSameSample == "TGCoveringOnlyVarieties"]
  **4.2.{n}** For the assessment of uniformity of {uniformityPropogationType}, a population standard of {populationStandard}% and an acceptance probability of at least {acceptanceProbability}% should be applied. In the case of a sample size of {plantSampleSize} {plants/fruit bodies}, {offType} {off-type(s) is/are allowed}. {addSentence}

  [IF lang == "de" AND (offType == "0" OR "no")]
    *(German zero off-type variant — shorter text)*
  [END IF]

  [IF lang == "es"]
    *(Spanish gendered off-type/off-types variants)*
  [END IF]
[END IF]

[IF uniformityOfftypeSameSampleAddInfo is not empty]
  **4.2.{n}** {uniformityOfftypeSameSampleAddInfo} *(rendered as HTML)*
[END IF]

[IF UniformityAssessmentDifferentSample contains "uniAllPlants"]
  **4.2.{n}** For the assessment of uniformity in a sample of {diffUniformityPlantSample} {plants/fruit bodies}, a population standard of {diffPopulationStandard}% and an acceptance probability of at least {diffAcceptanceProbability}% should be applied. In the case of a sample size of {diffPlantSampleSize} {plants/fruit bodies}, {diffOffType} off-types are allowed. {addSentence}
[END IF]

[IF UniformityAssessmentDifferentSample contains "UniformityAssessmentSubSample"]
  **4.2.{n}** *(Complex sub-sample uniformity assessment with parameters: SubSampleTypeA/B/C, population standard, acceptance probability, sample size, off-type counts, row sub-sample type)*
[END IF]

[IF uniformityOfftypeAllPlantsAddInfo is not empty]
  **4.2.{n}** {uniformityOfftypeAllPlantsAddInfo} *(rendered as HTML)*
[END IF]

[IF uniformityOfftypeSubSampleAddInfo is not empty]
  **4.2.{n}** {uniformityOfftypeSubSampleAddInfo} *(rendered as HTML)*
[END IF]

[IF uniformityAddInfo is not empty]
  **4.2.{n}** {uniformityAddInfo} *(rendered as HTML)*
[END IF]

### 4.3 Stability

**4.3.1** In practice, it is not usual to perform tests of stability that produce results as certain as those of the testing of distinctness and uniformity. However, experience has demonstrated that, for many types of variety, when a variety has been shown to be uniform, it can also be considered to be stable.

[IF TGCovering == "seedvegetative"]
  **4.3.2** Where appropriate, or in cases of doubt, stability may be further examined by testing a new seed or plant stock to ensure that it exhibits the same characteristics as those shown by the initial material supplied.
[ELSE IF TGCovering == "seed"]
  **4.3.2** Where appropriate, or in cases of doubt, stability may be further examined by testing a new seed stock to ensure that it exhibits the same characteristics as those shown by the initial material supplied.
[ELSE IF TGCovering == "vegetative"]
  [IF isMushroom == "N"]
    **4.3.2** Where appropriate, or in cases of doubt, stability may be further examined by testing a new plant stock to ensure that it exhibits the same characteristics as those shown by the initial material supplied.
  [ELSE]
    **4.3.2** Where appropriate, or in cases of doubt, stability may be further examined by testing a new stock to ensure that it exhibits the same characteristics as those shown by the initial material supplied.
  [END IF]
[END IF]

[IF IsParentLineAssessed == "Y"]
  **4.3.3** Where appropriate, or in cases of doubt, the stability of a hybrid variety may, in addition to an examination of the hybrid variety itself, also be assessed by examination of the uniformity and stability of its parent lines.
[END IF]

[IF stabilityAddInfo is not empty]
  **4.3.{n}** {stabilityAddInfo} *(rendered as HTML)*
[END IF]

---

## 5. Grouping of Varieties and Organization of the Growing Trial

**5.1** The selection of varieties of common knowledge to be grown in the trial with the candidate varieties and the way in which these varieties are divided into groups to facilitate the assessment of distinctness are aided by the use of grouping characteristics.

**5.2** Grouping characteristics are those in which the documented states of expression, even where produced at different locations, can be used, either individually or in combination with other such characteristics: (a) to select varieties of common knowledge that can be excluded from the growing trial used for examination of distinctness; and (b) to organize the growing trial so that similar varieties are grouped together.

**5.3** The following have been agreed as useful grouping characteristics:

[IF characteristicsList is not empty]
  *For each grouping characteristic:*
  ({rowNumber}) {TOC_NAME} (characteristic {CharacteristicOrder})
  [IF Grouping_Text is not empty]
    *(Grouping text values listed, first inline, subsequent indented)*
  [END IF]
[END IF]

[IF GroupingSummaryText is not empty]
  *(Summary text paragraph — rendered as HTML)*
[END IF]

**5.4** Guidance for the use of grouping characteristics, in the process of examining distinctness, is provided through the General Introduction and document TGP/9 "Examining Distinctness".

---

## 6. Introduction to the Table of Characteristics

### 6.1 Categories of Characteristics

**6.1.1** Standard Test Guidelines Characteristics

Standard Test Guidelines characteristics are those which are approved by UPOV for examination of DUS and from which members of the Union can select those suitable for their particular circumstances.

**6.1.2** Asterisked Characteristics

Asterisked characteristics (denoted by *) are those included in the Test Guidelines which are important for the international harmonization of variety descriptions and should always be examined for DUS and included in the variety description by all members of the Union, except when the state of expression of a preceding characteristic or regional environmental conditions render this inappropriate.

### 6.2 States of Expression and Corresponding Notes

**6.2.1** States of expression are given for each characteristic to define the characteristic and to harmonize descriptions. Each state of expression is allocated a corresponding numerical note for ease of recording of data and for the production and exchange of the description.

**6.2.2** All relevant states of expression are presented in the characteristic.

**6.2.3** Further explanation of the presentation of states of expression and notes is provided in document TGP/7 "Development of Test Guidelines".

### 6.3 Types of Expression

An explanation of the types of expression of characteristics (qualitative, quantitative and pseudo-qualitative) is provided in the General Introduction.

### 6.4 Example Varieties

Where appropriate, example varieties are provided to clarify the states of expression of each characteristic.

[IF ExampleVarietyText is not empty]
  *(Example variety additional text — rendered as HTML)*
[END IF]

### 6.5 Legend

**Table:** Legend for Table of Characteristics

| Col | Header |
|-----|--------|
| 1 | *(empty — sequence number)* |
| 2 | English |
| 3 | français |
| 4 | deutsch |
| 5 | español |
| 6 | Example Varieties / Exemples / Beispielssorten / Variedades ejemplo |
| 7 | Note / Nota |

**Key:**

1. Characteristic number
2. (*) Asterisked characteristic — see Chapter 6.1.2
3. Type of expression: QL (Qualitative) / QN (Quantitative) / PQ (Pseudo-qualitative) — see Chapter 6.3
4. Method of observation (and type of plot, if applicable): MG, MS, VG, VS — see Chapter 4.1.5
5. (+) See Explanations on the Table of Characteristics in Chapter 8.2

[IF maxIndicationLabel is null]
  6. Not applicable
[ELSE IF maxIndicationLabel == "a"]
  6. (a) — See Explanations on the Table of Characteristics in Chapter 8.1
[ELSE]
  6. (a)-({maxIndicationLabel}) — See Explanations on the Table of Characteristics in Chapter 8.1
[END IF]

[IF growthStage data exists for this TG]
  7. Growth stage key — See Explanations on the Table of Characteristics in Chapter 8.3
[ELSE]
  7. Not applicable
[END IF]

[IF CharacteristicLegend is not empty]
  *(Additional legend text — rendered as HTML)*
[END IF]

---

## 7. Table of Characteristics / Tableau des caractères / Merkmalstabelle / Tabla de caracteres

*(Narrow margins applied for this section)*

**Table:** 7-column table

| Col 1 | Col 2 (EN) | Col 3 (FR) | Col 4 (DE) | Col 5 (ES) | Col 6 (Examples) | Col 7 (Note) |
|-------|------------|------------|------------|------------|-------------------|--------------|

*For each characteristic (grouped by TOC_ID):*

**Header row (grey background):**

| {sequenceNumber}. | [IF Asterisk == "Y"] (*) [END IF] | {ExpressionType} | {ObservationM_PlotT} | [IF indivFlag != 0] (+) [END IF] | {FULL_IND} | {GrowthStages} |

**Characteristic name row (first row only per group):**

[IF tocName is not empty] → Bold English characteristic name
[IF charFR is not empty] → Bold French characteristic name
[IF charDE is not empty] → Bold German characteristic name
[IF charES is not empty] → Bold Spanish characteristic name

**State rows (for each expression state):**

| *(merged with sequence)* | {EXP_EN} | {EXP_FR} | {EXP_DE} | {EXP_ES} | {ORDERED_Example_Varieties} | [IF note != "999" AND note != "0"] {note} [ELSE] *(empty)* [END IF] |

---

## 8. Explanations on the Table of Characteristics

[IF numberOfMultipleCharacteristicsExplanations > 0]

  [IF generalExplanation is not empty]
    *(General explanation text — rendered as HTML)*
  [END IF]

  ### 8.1 Explanations covering several characteristics

  Characteristics containing the following key in the Table of Characteristics should be examined as indicated below:

  *For each explanation entry:*
  ({IndicationLabel}) {LabelExplanation} *(rendered as HTML)*

[END IF]

### 8.{1 or 2} Explanations for individual characteristics

*For each characteristic with explanations:*

[IF lang == "de"]
  Zu {CharacteristicOrder}: *{tocName}*
[ELSE IF lang == "fr"]
  Ad. {CharacteristicOrder} : *{tocName}*
[ELSE]
  Ad. {CharacteristicOrder}: *{tocName}*
[END IF]

[IF Explaination_Text is not empty]
  *(Explanation text — rendered as HTML, may contain images)*
[END IF]

[IF secEightThreeList is not empty]
  ### 8.{2 or 3} Additional Explanations on the Table of Characteristic

  *For each additional reference:*
  [IF additionalCharacteriticsReferences is not empty]
    {additionalCharacteriticsReferences} *(rendered as HTML)*
  [END IF]
[END IF]

---

## 9. Literature

*For each literature entry:*

[IF LiteratureReferences is not empty]
  {LiteratureReferences} *(rendered as HTML)*
[END IF]

---

## 10. Technical Questionnaire

> *Header/footer changes to TQ-specific format with TQ footer text.*

TECHNICAL QUESTIONNAIRE

to be completed in connection with an application for plant breeders' rights

[IF TqHybridVariety == "Y"]
  In the case of hybrid varieties which are the subject of an application for plant breeders' rights, and where the parent lines are to be submitted as a part of the examination of the hybrid variety, this Technical Questionnaire should be completed for each of the parent lines, in addition to being completed for the hybrid variety.
[END IF]

### TQ Section 1: Subject of the Technical Questionnaire

*For each species/subject entry:*

[IF multiple species entries → use compound numbering (1.{n}.1, 1.{n}.2, ...)]
[ELSE → use simple numbering (1.1, 1.2, ...)]
[END IF]

**1.{x}.1** Botanical name: [text box with DB: TqBotanicalName]
**1.{x}.2** Common name: [text box with DB: TqCommonName]

[IF TqAdditionalInfo is not empty AND not placeholder text ("Add...", "Ajouter...", "Andere...", "Agregar...")]
  **1.{x}.3** {TqAdditionalInfo}: [text box]
[END IF]

[IF multiple species AND not single entry]
  *(Checkbox shown next to each species for selection)*
[END IF]

### TQ Section 2: Applicant

| Field | Input |
|-------|-------|
| Name | [text box] |
| Address | [text box] |
| Telephone No. | [text box] |
| Fax No. | [text box] |
| E-mail address | [text box] |
| Breeder (if different from applicant) | [text box] |

### TQ Section 3: Proposed denomination and breeder's reference

| Field | Input |
|-------|-------|
| Proposed denomination (if available) | [text box] |
| Breeder's reference | [text box] |

### TQ Section 4: Information on the breeding scheme and propagation of the variety

**4.1** Breeding scheme — Variety resulting from:

| Option | Details |
|--------|---------|
| (a) Crossing | [checkbox] — please state parent varieties: (...female...) x (...male...) |
| (b) Mutation | [checkbox] — please state parent varieties |
| (c) Discovery and development | [checkbox] — please state where and when discovered and how developed |
| (d) Other | [checkbox] — Please provide details [text box] |

**4.2** Method of propagating the variety

> *Dynamic sub-numbering based on which propagation categories have data.*

[IF seedPropagationVarieties is not empty]
  **4.2.{n}** Seed-propagated varieties
  *For each seed propagation type:*
  - ({letter}) {propagation type label} [checkbox]

  [IF "Other" seed propagation present]
    ({letter}) Other (state method) [text box]
  [END IF]
[END IF]

[IF vegetativePropagationVarieties is not empty]
  **4.2.{n}** Vegetative propagation
  *For each vegetative propagation type (Tuber, Cuttings, In vitro, Budding/Grafting, Division, Rhizomes, Other):*
  - ({letter}) {type label} [checkbox]

  [IF "Other" vegetative propagation present]
    ({letter}) Other (state method) [text box]
  [END IF]
[END IF]

[IF othersMap is not empty]
  **4.2.{n}** Other (Please provide details) [text box]
[END IF]

> *The sub-numbering (4.2.1, 4.2.2, 4.2.3, 4.2.4) is computed based on which categories are present:*
> - Only seed → 4.2.1
> - Only vegetative → 4.2.1
> - Seed + vegetative → 4.2.1, 4.2.2
> - Seed + vegetative + other → 4.2.1, 4.2.2, 4.2.3
> - etc.

[IF ProdSchemeInfo is not empty]
  *(Production scheme info table — rendered as HTML)*
[ELSE]
  *(Section skipped)*
[END IF]

### TQ Section 5: Characteristics of the variety to be indicated

*(the number in brackets refers to the corresponding characteristic in Test Guidelines; please mark the note which best corresponds)*

**Table:** Characteristics with checkboxes

| Characteristics | Example Varieties | Note |
|----------------|-------------------|------|

*For each characteristic from DB (grouped by TOC_ID):*

[IF characteristic name length > 40]
  *(Extra spacing allocated for page break management)*
[END IF]

*(Characteristic rows with expression states and note checkboxes)*

### TQ Section 6: Similar varieties and differences from these varieties

Please use the following table and box for comments to provide information on how your candidate variety differs from the variety (or varieties) which, to the best of your knowledge, is (or are) most similar.

| Denomination(s) of similar variety(ies) | Characteristic(s) in which your candidate differs | Expression for **similar** variety(ies) | Expression for **your** candidate variety |
|--|--|--|--|

### TQ Section 7: Additional information

7.1 In addition to the information provided in sections 5 and 6, are there any additional characteristics which may help to distinguish the variety?
- Yes [checkbox] / No [checkbox]
- If yes, please provide details

7.2 Are there any special conditions for growing the variety or conducting the examination?
- Yes [checkbox] / No [checkbox]

7.3 Other information

### TQ Section 8: Authorization for release

(a) Does the variety require prior authorization for release under legislation concerning the protection of the environment, human and animal health?
- Yes [checkbox] / No [checkbox]

(b) Has such authorization been obtained?
- Yes [checkbox] / No [checkbox]

If the answer to (b) is yes, please attach a copy of the authorization.

### TQ Section 9: Information on plant material

The expression of a characteristic or several characteristics of a variety may be affected by factors, such as pests and disease, chemical treatment (e.g. growth retardants or pesticides), effects of tissue culture, different rootstocks, scions taken from different growth phases of a tree, etc.

[IF isMushroom == "N"]
  The plant material should not have undergone any treatment...
[ELSE]
  The material to be examined...
[END IF]

| Factor | Yes | No |
|--------|-----|-----|
| (a) Microorganisms (e.g. virus, bacteria, phytoplasma) | [checkbox] | [checkbox] |
| (b) Chemical treatment (e.g. growth retardant, pesticide) | [checkbox] | [checkbox] |
| (c) Tissue culture | [checkbox] | [checkbox] |
| (d) Other factors | [checkbox] | [checkbox] |

Please provide details for where you have indicated "yes".

[IF isMushroom == "N"]
  Has the plant material to be examined been tested for the presence of virus or other pathogens?
[ELSE]
  Has the material to be examined been tested for the presence of virus or other pathogens?
[END IF]

### TQ Section 10: Declaration

I hereby declare that, to the best of my knowledge, the information provided in this form is correct:

| Applicant's name | Signature | Date |
|--|--|--|

### TQ Photograph

A representative color photograph of the variety displaying its main distinguishing feature(s), should accompany the Technical Questionnaire.

The key points to consider when taking a photograph of the candidate variety are:
- Indication of the date and geographic location
- Correct labeling (breeder's reference)
- Good quality printed photograph (minimum 10 cm x 15 cm) and/or sufficient resolution electronic format version (minimum 960 x 1280 pixels)

Further guidance on providing photographs with the Technical Questionnaire is available in document TGP/7 "Development of Test Guidelines", Guidance Note 35.

---

## Annex

[IF AnnexList has entries]
  *For each annex entry:*
  [IF annexRefData is not empty]
    **Annex**

    {annexRefData} *(rendered as HTML)*
  [END IF]
[END IF]

---

*End of document*
