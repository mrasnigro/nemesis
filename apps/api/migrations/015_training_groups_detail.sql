-- Group cards show a short description and an active/paused status.

ALTER TABLE training_groups
  ADD COLUMN description VARCHAR(500) NULL AFTER name,
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active' AFTER description;
