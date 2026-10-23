ALTER TABLE bdr_telephony_settings
  ADD COLUMN ari_url VARCHAR(255) NULL AFTER device_id,
  ADD COLUMN ari_username VARCHAR(128) NULL AFTER ari_url,
  ADD COLUMN ari_password_enc VARCHAR(512) NULL AFTER ari_username,
  ADD COLUMN trunk_endpoint VARCHAR(80) NULL AFTER ari_password_enc,
  ADD COLUMN caller_id VARCHAR(40) NULL AFTER trunk_endpoint,
  ADD COLUMN max_channels INT NOT NULL DEFAULT 5 AFTER caller_id;
