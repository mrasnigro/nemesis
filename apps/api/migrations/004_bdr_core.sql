CREATE TABLE IF NOT EXISTS bdr_campaigns (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(32) NOT NULL,
  lead_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  campaign_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_bdr_campaigns_list (customer_id, status, created_at),
  CONSTRAINT fk_bdr_campaigns_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bdr_calls (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  user_id CHAR(26) NOT NULL,
  campaign_id CHAR(26) NULL,
  phone VARCHAR(40) NOT NULL,
  lead_name VARCHAR(200) NULL,
  company VARCHAR(200) NULL,
  mode VARCHAR(32) NOT NULL,
  call_status VARCHAR(64) NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  call_json JSON NOT NULL,
  started_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_bdr_calls_list (customer_id, started_at),
  KEY idx_bdr_calls_campaign (customer_id, campaign_id, started_at),
  CONSTRAINT fk_bdr_calls_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_bdr_calls_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bdr_meetings (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  call_id CHAR(26) NULL,
  lead_name VARCHAR(200) NOT NULL,
  company VARCHAR(200) NULL,
  starts_at DATETIME(3) NOT NULL,
  meeting_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_bdr_meetings_list (customer_id, starts_at),
  CONSTRAINT fk_bdr_meetings_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
