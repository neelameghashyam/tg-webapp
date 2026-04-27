-- Migration: Add new workflow statuses and isPartialRevision column
-- Run against upovtg database

-- 1. Add missing status codes to Status_TG
INSERT IGNORE INTO Status_TG (Status_Code, Status_Desc) VALUES
  ('TWD', 'TWP Discussion Draft'),
  ('TDD', 'TC-EDC/TC Discussion Draft'),
  ('ADC', 'Adopted by Correspondence');

-- 2. Add isPartialRevision column to TG table
ALTER TABLE TG ADD COLUMN isPartialRevision VARCHAR(1) NOT NULL DEFAULT 'N' AFTER IsTGStatusOverride;

-- 3. Backfill isPartialRevision for existing TGs with "Rev" in their reference
UPDATE TG SET isPartialRevision = 'Y' WHERE LOWER(TG_Reference) LIKE '%rev%';

-- 4. Verify
SELECT Status_Code, Status_Desc FROM Status_TG ORDER BY Status_Code;
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'TG' AND COLUMN_NAME = 'isPartialRevision';
SELECT COUNT(*) as partialRevisionCount FROM TG WHERE isPartialRevision = 'Y';
