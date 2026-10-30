ALTER TABLE bdr_telephony_settings
  ADD COLUMN amd_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER sip_domain;
