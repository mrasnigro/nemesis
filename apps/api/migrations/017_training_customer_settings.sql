-- Per-customer Training AI settings (org policy flags).

CREATE TABLE IF NOT EXISTS training_customer_settings (
  customer_id CHAR(26) NOT NULL,
  require_2fa TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (customer_id),
  CONSTRAINT fk_training_customer_settings_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
