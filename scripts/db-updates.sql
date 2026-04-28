-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Create TG_EDCComments table
-- Mirrors TG_IEComments exactly, but scoped to EDC members during ECC phase.
-- Run against upovtg database.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS TG_EDCComments (
  EDCComments_ID       INT            NOT NULL AUTO_INCREMENT,
  User_ID              INT            NOT NULL,           -- EDC member who wrote it
  Chapter_Name         VARCHAR(250)   DEFAULT NULL,
  Section_Name         VARCHAR(250)   DEFAULT NULL,
  Comments             LONGTEXT       DEFAULT NULL,
  TG_ID                INT            NOT NULL,
  CharacteristicOrder  INT            DEFAULT NULL,
  LastUpdated          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  Modified_Time        TIMESTAMP      NULL DEFAULT NULL,
  Created_Time         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (EDCComments_ID),

  CONSTRAINT fk_edcc_tg   FOREIGN KEY (TG_ID)    REFERENCES TG (TG_ID),
  CONSTRAINT fk_edcc_user FOREIGN KEY (User_ID)   REFERENCES User_Profile (User_ID)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────────────
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'TG_EDCComments'
ORDER BY ORDINAL_POSITION;