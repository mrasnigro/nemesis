ALTER TABLE bdr_asterisk_channel_leases
  ADD COLUMN slots TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER trunk_key;
