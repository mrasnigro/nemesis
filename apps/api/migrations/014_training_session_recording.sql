-- A session can start from a persona, so scenario_id is optional.
-- duration_ms and audio_path describe the finished call. Each message stores when it started
-- and how long it lasted; the communication report reads those times.

ALTER TABLE training_sessions
  MODIFY COLUMN scenario_id CHAR(26) NULL,
  ADD COLUMN duration_ms INT UNSIGNED NULL AFTER score,
  ADD COLUMN audio_path VARCHAR(255) NULL AFTER duration_ms;

ALTER TABLE training_session_messages
  ADD COLUMN offset_ms INT UNSIGNED NULL AFTER text,
  ADD COLUMN duration_ms INT UNSIGNED NULL AFTER offset_ms;
