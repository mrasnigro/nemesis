-- Housekeeping: bdr_dial_attempts.provider_json was added with the dialer in 004 but no code reads or writes it.
-- The provider's identifiers that matter are already columns (provider, provider_call_id, provider_seen).

ALTER TABLE bdr_dial_attempts DROP COLUMN provider_json;
