-- Training sessions become a server-side conversation instead of a report the browser uploads.
-- Data change: sessions saved by the old client keep their transcript (copied from report.messages into
-- training_session_messages) and their persona (report.personaId).

ALTER TABLE training_sessions
  ADD COLUMN persona_id CHAR(26) NULL AFTER scenario_id,
  ADD COLUMN media_mode ENUM('text', 'voice') NOT NULL DEFAULT 'text' AFTER status,
  ADD COLUMN ai_provider VARCHAR(40) NULL AFTER media_mode,
  ADD COLUMN judge_source VARCHAR(40) NULL AFTER ai_provider,
  ADD KEY idx_training_sessions_user (customer_id, user_id, status, created_at);

CREATE TABLE IF NOT EXISTS training_session_messages (
  id CHAR(26) NOT NULL,
  session_id CHAR(26) NOT NULL,
  seq INT UNSIGNED NOT NULL,
  role ENUM('ai', 'user') NOT NULL,
  speaker VARCHAR(200) NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_session_messages_seq (session_id, seq),
  CONSTRAINT fk_training_session_messages_session FOREIGN KEY (session_id) REFERENCES training_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE training_sessions
SET persona_id = JSON_UNQUOTE(JSON_EXTRACT(session_json, '$.report.personaId'))
WHERE persona_id IS NULL AND JSON_EXTRACT(session_json, '$.report.personaId') IS NOT NULL;

INSERT INTO training_session_messages (id, session_id, seq, role, speaker, text, created_at)
SELECT
  LEFT(REPLACE(UUID(), '-', ''), 26),
  s.id,
  m.ord,
  IF(m.role = 'user', 'user', 'ai'),
  COALESCE(NULLIF(m.speaker, ''), IF(m.role = 'user', 'Você', 'Persona')),
  m.body,
  COALESCE(STR_TO_DATE(LEFT(m.ts, 23), '%Y-%m-%dT%H:%i:%s.%f'), s.created_at)
FROM training_sessions s
JOIN JSON_TABLE(
  s.session_json,
  '$.report.messages[*]' COLUMNS (
    ord FOR ORDINALITY,
    role VARCHAR(8) PATH '$.role',
    speaker VARCHAR(200) PATH '$.speaker',
    body TEXT PATH '$.text',
    ts VARCHAR(40) PATH '$.timestamp'
  )
) AS m
WHERE m.body IS NOT NULL AND m.body <> '';

-- The transcript now lives in its own table.
UPDATE training_sessions
SET session_json = JSON_REMOVE(session_json, '$.report.messages', '$.report.answers')
WHERE JSON_EXTRACT(session_json, '$.report') IS NOT NULL;
