CREATE TABLE IF NOT EXISTS training_personas (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(32) NOT NULL,
  industry VARCHAR(120) NULL,
  difficulty VARCHAR(32) NULL,
  profile_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_training_personas_list (customer_id, status, created_at),
  CONSTRAINT fk_training_personas_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_templates (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  title VARCHAR(200) NOT NULL,
  contact_type VARCHAR(120) NULL,
  template_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_training_templates_list (customer_id, created_at),
  CONSTRAINT fk_training_templates_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_scenarios (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  title VARCHAR(200) NOT NULL,
  difficulty VARCHAR(32) NOT NULL,
  funnel_stage VARCHAR(120) NULL,
  persona_id CHAR(26) NOT NULL,
  evaluation_template_id CHAR(26) NOT NULL,
  scenario_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_training_scenarios_list (customer_id, difficulty, created_at),
  KEY idx_training_scenarios_persona (customer_id, persona_id),
  CONSTRAINT fk_training_scenarios_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_sessions (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  scenario_id CHAR(26) NOT NULL,
  status VARCHAR(32) NOT NULL,
  score DECIMAL(6, 2) NULL,
  session_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  completed_at DATETIME(3) NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_training_sessions_list (customer_id, created_at),
  KEY idx_training_sessions_scenario (customer_id, scenario_id, created_at),
  CONSTRAINT fk_training_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_training_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
