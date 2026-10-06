-- Webinar plans, one subscription per customer, and manual payment records (no payment gateway).
-- This file also inserts data: the four starter plans below, with fixed ids so it is safe to re-run.
-- A NULL limit means "no limit". Money is stored in cents.

-- The catalog is shared by every customer and managed by IMP administrators, so it has no customer_id.
CREATE TABLE IF NOT EXISTS webinar_plans (
  id CHAR(26) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price_cents INT UNSIGNED NOT NULL DEFAULT 0,
  max_duration_minutes INT UNSIGNED NULL,
  max_participants INT UNSIGNED NULL,
  replay_storage_days INT UNSIGNED NULL,
  features_json JSON NOT NULL,
  -- The plan a customer is put on the first time it uses Webinar. At most one plan has this set.
  is_starter TINYINT(1) NOT NULL DEFAULT 0,
  trial_days INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_webinar_plans_list (deleted_at, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What a customer has contracted. "Expired" is not stored: it is `expires_at` in the past.
CREATE TABLE IF NOT EXISTS webinar_subscriptions (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  plan_id CHAR(26) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webinar_subscriptions_customer (customer_id),
  KEY idx_webinar_subscriptions_plan (plan_id),
  CONSTRAINT fk_webinar_subscriptions_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_webinar_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES webinar_plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A payment an IMP administrator registered by hand. `plan_id` keeps what was paid for even if the plan changes later.
CREATE TABLE IF NOT EXISTS webinar_payments (
  id CHAR(26) NOT NULL,
  customer_id CHAR(26) NOT NULL,
  plan_id CHAR(26) NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  method VARCHAR(50) NULL,
  note VARCHAR(500) NULL,
  paid_at DATETIME(3) NOT NULL,
  period_start DATETIME(3) NOT NULL,
  period_end DATETIME(3) NOT NULL,
  recorded_by_user_id CHAR(26) NULL,
  created_at DATETIME(3) NOT NULL,
  voided_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_webinar_payments_customer (customer_id, paid_at),
  CONSTRAINT fk_webinar_payments_customer FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT fk_webinar_payments_plan FOREIGN KEY (plan_id) REFERENCES webinar_plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO webinar_plans
  (id, name, description, price_cents, max_duration_minutes, max_participants, replay_storage_days,
   features_json, is_starter, trial_days, is_active, sort_order, created_at, updated_at)
VALUES
  ('01WEBPKG00000000000000001A', 'Trial', 'Plano gratuito por 30 dias para testar a plataforma',
   0, 20, 5, 30, JSON_ARRAY('Chat ao vivo', 'Enquetes', 'Chamadas para ação'),
   1, 30, 1, 10, NOW(3), NOW(3)),
  ('01WEBPKG00000000000000002B', 'Básico', 'Plano básico para pequenos eventos',
   9900, 30, 1000, 30, JSON_ARRAY('Chat ao vivo', 'Enquetes', 'Chamadas para ação', 'Replays', 'Relatórios'),
   0, NULL, 1, 20, NOW(3), NOW(3)),
  ('01WEBPKG00000000000000003C', 'Profissional', 'Plano profissional para eventos médios',
   29900, 120, 5000, NULL,
   JSON_ARRAY('Chat ao vivo', 'Enquetes', 'Chamadas para ação', 'Replays', 'Relatórios', 'Automação', 'Integrações'),
   0, NULL, 1, 30, NOW(3), NOW(3)),
  ('01WEBPKG00000000000000004D', 'Enterprise', 'Plano sem limites',
   99900, NULL, NULL, NULL,
   JSON_ARRAY('Chat ao vivo', 'Enquetes', 'Chamadas para ação', 'Replays', 'Relatórios', 'Automação', 'Integrações', 'Suporte prioritário'),
   0, NULL, 1, 40, NOW(3), NOW(3));
