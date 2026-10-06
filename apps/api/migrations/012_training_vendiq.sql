-- The persona is the simulation. A session can start from a persona without a separate scenario row.
-- Groups scope a persona and filter history. Message timing and the recording feed the communication report.

ALTER TABLE training_personas
  ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'company' AFTER difficulty,
  ADD COLUMN owner_user_id CHAR(26) NULL AFTER visibility,
  ADD COLUMN group_id CHAR(26) NULL AFTER owner_user_id,
  ADD COLUMN scenario_type VARCHAR(32) NULL AFTER group_id,
  ADD COLUMN evaluation_template_id CHAR(26) NULL AFTER scenario_type;

ALTER TABLE training_sessions
  MODIFY COLUMN scenario_id CHAR(26) NULL,
  ADD COLUMN duration_ms INT UNSIGNED NULL AFTER score,
  ADD COLUMN audio_path VARCHAR(255) NULL AFTER duration_ms;

ALTER TABLE training_session_messages
  ADD COLUMN offset_ms INT UNSIGNED NULL AFTER text,
  ADD COLUMN duration_ms INT UNSIGNED NULL AFTER offset_ms;

CREATE TABLE IF NOT EXISTS training_groups (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_training_groups_list (customer_id, created_at),
  CONSTRAINT fk_training_groups_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_group_members (
  group_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (group_id, user_id),
  KEY idx_training_group_members_user (customer_id, user_id),
  CONSTRAINT fk_training_group_members_group FOREIGN KEY (group_id) REFERENCES training_groups (id),
  CONSTRAINT fk_training_group_members_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
