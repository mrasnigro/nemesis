-- Columns the persona list filters on. The rest of the form stays in profile_json.
-- visibility is individual, company or group. scenario_type is the five fixed call types.
-- evaluation_template_id is the published template used when a session starts from this persona.

ALTER TABLE training_personas
  ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'company' AFTER difficulty,
  ADD COLUMN owner_user_id CHAR(26) NULL AFTER visibility,
  ADD COLUMN group_id CHAR(26) NULL AFTER owner_user_id,
  ADD COLUMN scenario_type VARCHAR(32) NULL AFTER group_id,
  ADD COLUMN evaluation_template_id CHAR(26) NULL AFTER scenario_type,
  ADD KEY idx_training_personas_scope (customer_id, visibility, owner_user_id),
  ADD KEY idx_training_personas_group (customer_id, group_id),
  ADD CONSTRAINT fk_training_personas_owner FOREIGN KEY (owner_user_id) REFERENCES users (id),
  ADD CONSTRAINT fk_training_personas_group FOREIGN KEY (group_id) REFERENCES training_groups (id);
