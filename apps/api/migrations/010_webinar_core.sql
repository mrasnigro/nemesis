-- Webinar module on the platform database (replaces the separate `imp_webinar` schema).
-- Structure only: it does not copy anything from `imp_webinar`.
-- Not carried over: plans, client_subscriptions and payments (the contract lives on `customers`),
-- lead_chat_messages (never written), the Webinar `users` and `audit_logs` (platform ones are used).

CREATE TABLE IF NOT EXISTS webinar_webinars (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  owner_user_id CHAR(26) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at DATETIME(3) NOT NULL,
  duration_minutes INT NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/Sao_Paulo',
  is_recurring TINYINT(1) NOT NULL DEFAULT 0,
  recurrence_pattern VARCHAR(100) NULL,
  recurrence_end_at DATETIME(3) NULL,
  presenter_name VARCHAR(255) NULL,
  presenter_bio TEXT NULL,
  presenter_image_url VARCHAR(500) NULL,
  registration_color VARCHAR(7) NOT NULL DEFAULT '#007bff',
  max_participants INT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_webinar_webinars_list (customer_id, status, scheduled_at),
  KEY idx_webinar_webinars_owner (customer_id, owner_user_id),
  CONSTRAINT fk_webinar_webinars_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_webinar_webinars_owner FOREIGN KEY (owner_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The code a lead types (or follows from a link) to reach one session of a webinar.
CREATE TABLE IF NOT EXISTS webinar_access_codes (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  webinar_id CHAR(26) NOT NULL,
  code VARCHAR(50) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  max_leads INT NULL,
  lead_count INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webinar_access_codes_code (code),
  KEY idx_webinar_access_codes_webinar (customer_id, webinar_id),
  CONSTRAINT fk_webinar_access_codes_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_webinar_access_codes_webinar FOREIGN KEY (webinar_id) REFERENCES webinar_webinars (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A person who registered. The id is the unguessable handle the public pages keep for the session.
CREATE TABLE IF NOT EXISTS webinar_leads (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  webinar_id CHAR(26) NOT NULL,
  access_code_id CHAR(26) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'registered',
  registered_at DATETIME(3) NOT NULL,
  attended_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_webinar_leads_list (customer_id, webinar_id, status, registered_at),
  KEY idx_webinar_leads_email (webinar_id, email),
  CONSTRAINT fk_webinar_leads_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_webinar_leads_webinar FOREIGN KEY (webinar_id) REFERENCES webinar_webinars (id),
  CONSTRAINT fk_webinar_leads_access_code FOREIGN KEY (access_code_id) REFERENCES webinar_access_codes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Room chat: presenter messages (user_id) and participant messages (lead_id).
CREATE TABLE IF NOT EXISTS webinar_chat_messages (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  webinar_id CHAR(26) NOT NULL,
  lead_id CHAR(26) NULL,
  user_id CHAR(26) NULL,
  sender_name VARCHAR(255) NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_webinar_chat_room (customer_id, webinar_id, created_at),
  CONSTRAINT fk_webinar_chat_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_webinar_chat_webinar FOREIGN KEY (webinar_id) REFERENCES webinar_webinars (id),
  CONSTRAINT fk_webinar_chat_lead FOREIGN KEY (lead_id) REFERENCES webinar_leads (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
