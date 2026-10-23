CREATE TABLE IF NOT EXISTS bdr_asterisk_channel_leases (
  customer_id CHAR(26) NOT NULL,
  attempt_id CHAR(26) NOT NULL,
  trunk_key CHAR(64) NOT NULL,
  acquired_at DATETIME(3) NOT NULL,
  PRIMARY KEY (attempt_id),
  KEY idx_bdr_asterisk_leases_customer (customer_id, acquired_at),
  KEY idx_bdr_asterisk_leases_trunk (trunk_key, acquired_at),
  CONSTRAINT fk_bdr_asterisk_lease_attempt
    FOREIGN KEY (attempt_id) REFERENCES bdr_dial_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
