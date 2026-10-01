-- Customer contracts, user profiles/status and the admin audit trail.
-- Effective module access = customer_modules ∩ user_modules (see packages/shared effectiveModuleIds).

ALTER TABLE customers
  ADD COLUMN slug VARCHAR(80) NULL AFTER name,
  ADD COLUMN plan ENUM('Starter', 'Growth', 'Enterprise') NOT NULL DEFAULT 'Starter' AFTER slug,
  ADD COLUMN status ENUM('active', 'trial', 'suspended') NOT NULL DEFAULT 'active' AFTER plan,
  ADD COLUMN deleted_at DATETIME(3) NULL AFTER updated_at;

UPDATE customers SET slug = LOWER(id) WHERE slug IS NULL;

ALTER TABLE customers
  MODIFY slug VARCHAR(80) NOT NULL,
  ADD UNIQUE KEY uq_customers_slug (slug);

ALTER TABLE users
  ADD COLUMN email VARCHAR(254) NULL AFTER name,
  ADD COLUMN profile ENUM('customer_admin', 'sdr_bdr', 'closer') NULL AFTER role,
  ADD COLUMN status ENUM('active', 'invited', 'inactive') NOT NULL DEFAULT 'active' AFTER profile,
  ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER password_hash,
  ADD COLUMN last_login_at DATETIME(3) NULL AFTER session_version,
  ADD COLUMN deleted_at DATETIME(3) NULL AFTER updated_at,
  ADD UNIQUE KEY uq_users_email (email);

UPDATE users SET profile = 'sdr_bdr' WHERE role = 'imp' AND profile IS NULL;

ALTER TABLE user_modules
  ADD COLUMN created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS customer_modules (
  customer_id CHAR(26) NOT NULL,
  module_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (customer_id, module_id),
  CONSTRAINT fk_customer_modules_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing user grants become the customer's contract so nobody loses access.
INSERT IGNORE INTO customer_modules (customer_id, module_id)
SELECT DISTINCT u.customer_id, um.module_id
FROM user_modules um
JOIN users u ON u.id = um.user_id
WHERE u.customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NULL,
  actor_user_id CHAR(26) NULL,
  actor_name VARCHAR(200) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(64) NULL,
  summary VARCHAR(300) NOT NULL,
  level ENUM('info', 'warning', 'error') NOT NULL DEFAULT 'info',
  data_json JSON NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_audit_logs_customer_created (customer_id, created_at),
  KEY idx_audit_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
