-- Monthly simulation minute quota per group (NULL = unlimited).

ALTER TABLE training_groups
  ADD COLUMN monthly_minutes INT UNSIGNED NULL AFTER status;
