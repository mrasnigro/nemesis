-- Groups a training administrator assigns people to.
-- A persona can be limited to one group, and session history can be filtered by it.

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
