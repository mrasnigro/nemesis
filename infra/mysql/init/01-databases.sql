-- Runs once, on a fresh MySQL volume. `imp` is created by MYSQL_DATABASE.
CREATE DATABASE IF NOT EXISTS imp_webinar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS imp_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON imp_webinar.* TO 'imp'@'%';
GRANT ALL PRIVILEGES ON imp_test.* TO 'imp'@'%';
FLUSH PRIVILEGES;
