CREATE TABLE IF NOT EXISTS customers (
  id CHAR(26) NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NULL,
  username VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  role ENUM('admin', 'imp') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_customer (customer_id),
  CONSTRAINT fk_users_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_modules (
  user_id CHAR(26) NOT NULL,
  module_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, module_id),
  CONSTRAINT fk_user_modules_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
