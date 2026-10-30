ALTER TABLE bdr_telephony_settings
  ADD COLUMN calling_start TIME NULL AFTER amd_enabled,
  ADD COLUMN calling_end TIME NULL AFTER calling_start,
  ADD COLUMN calling_days VARCHAR(16) NOT NULL DEFAULT '1,2,3,4,5' AFTER calling_end,
  ADD COLUMN inbound_extension VARCHAR(40) NULL AFTER calling_days,
  ADD COLUMN record_calls TINYINT(1) NOT NULL DEFAULT 1 AFTER inbound_extension;

ALTER TABLE bdr_dial_attempts
  MODIFY COLUMN user_id CHAR(26) NULL,
  ADD COLUMN direction VARCHAR(16) NOT NULL DEFAULT 'outbound' AFTER provider;
