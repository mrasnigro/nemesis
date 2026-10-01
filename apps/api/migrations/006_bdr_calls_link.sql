-- BDR: make bdr_calls the single, queryable record of an attendance.
--
-- Before this migration a saved call carried everything inside call_json and was only reachable from the dial
-- attempt through bdr_dial_attempts.call_id. Now the call knows its attempt and lead, the qualification and the
-- callback time are real columns, and campaign counters live only in lead_count / completed_count (maintained
-- from bdr_leads), so the JSON copies that could drift are removed.

ALTER TABLE bdr_calls
  ADD COLUMN attempt_id CHAR(26) NULL AFTER campaign_id,
  ADD COLUMN lead_id CHAR(26) NULL AFTER attempt_id,
  ADD COLUMN qualification_id VARCHAR(64) NULL AFTER call_status,
  ADD COLUMN callback_at DATETIME(3) NULL AFTER qualification_id,
  ADD UNIQUE KEY uq_bdr_calls_attempt (attempt_id),
  ADD KEY idx_bdr_calls_lead (customer_id, lead_id),
  ADD KEY idx_bdr_calls_qualification (customer_id, qualification_id, started_at);

-- Backfill the link from the attempt side, which was the only place it existed.
UPDATE bdr_calls c
JOIN bdr_dial_attempts a ON a.call_id = c.id
SET c.attempt_id = a.id, c.lead_id = a.lead_id;

-- Promote values that used to live only in the JSON document.
UPDATE bdr_calls
SET qualification_id = LEFT(JSON_UNQUOTE(JSON_EXTRACT(call_json, '$.qualificationId')), 64)
WHERE qualification_id IS NULL
  AND JSON_TYPE(JSON_EXTRACT(call_json, '$.qualificationId')) = 'STRING';

-- A meeting booked during a call is linked through bdr_meetings.call_id; older rows only had the id in JSON.
UPDATE bdr_meetings m
JOIN bdr_calls c ON c.id = JSON_UNQUOTE(JSON_EXTRACT(m.meeting_json, '$.linkedHistoryId'))
SET m.call_id = c.id
WHERE m.call_id IS NULL
  AND JSON_TYPE(JSON_EXTRACT(m.meeting_json, '$.linkedHistoryId')) = 'STRING';

ALTER TABLE bdr_meetings
  ADD KEY idx_bdr_meetings_call (customer_id, call_id);

-- Campaign counters are derived from the lead queue; stale JSON copies are dropped with the column.
UPDATE bdr_campaigns c
SET c.lead_count = (
      SELECT COUNT(*) FROM bdr_leads l WHERE l.campaign_id = c.id AND l.deleted_at IS NULL
    ),
    c.completed_count = (
      SELECT COUNT(*) FROM bdr_leads l
      WHERE l.campaign_id = c.id AND l.deleted_at IS NULL AND l.status IN ('done', 'failed')
    );

ALTER TABLE bdr_campaigns DROP COLUMN campaign_json;
