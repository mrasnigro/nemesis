ALTER TABLE bdr_telephony_settings
  ADD COLUMN webrtc_wss_url VARCHAR(255) NULL AFTER max_channels,
  ADD COLUMN sip_domain VARCHAR(255) NULL AFTER webrtc_wss_url;
