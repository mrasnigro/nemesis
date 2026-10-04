-- BDR: automatic attendance summary and call transcript.
--
-- The summary built from the saved form is computed on read and never stored. These columns hold what a
-- language model produced (from the form and, once the recording arrives, its transcript) and the state of
-- that background job, so it survives API restarts.

ALTER TABLE bdr_calls
  ADD COLUMN summary_text TEXT NULL AFTER call_json,
  ADD COLUMN summary_source VARCHAR(16) NULL AFTER summary_text,
  ADD COLUMN summary_status VARCHAR(16) NOT NULL DEFAULT 'none' AFTER summary_source,
  ADD COLUMN summary_tries INT NOT NULL DEFAULT 0 AFTER summary_status,
  ADD COLUMN summary_updated_at DATETIME(3) NULL AFTER summary_tries,
  ADD COLUMN transcript_text MEDIUMTEXT NULL AFTER summary_updated_at,
  ADD KEY idx_bdr_calls_summary (summary_status, summary_updated_at);
