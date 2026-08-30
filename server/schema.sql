-- Ludo League Master Database Schema for MySQL 8+

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  allowed_leagues TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leagues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_league_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NULL,
  profile_photo LONGTEXT NULL,
  mobile_number VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  date_joined DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_bot TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_bot (is_bot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  league_id INT NOT NULL DEFAULT 1,
  friendly_id VARCHAR(30) NOT NULL UNIQUE,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  player_count INT NOT NULL,
  notes TEXT NULL,
  action_logs LONGTEXT NULL,
  kill_logs LONGTEXT NULL,
  created_by INT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_by INT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_league_id (league_id),
  INDEX idx_match_date (match_date),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_player_count (player_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS match_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  match_id INT NOT NULL,
  player_id INT NOT NULL,
  position INT NOT NULL,
  points_awarded DECIMAL(8,2) NOT NULL,
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_player FOREIGN KEY (player_id) REFERENCES players(id),
  UNIQUE KEY idx_match_player (match_id, player_id),
  UNIQUE KEY idx_match_position (match_id, position),
  INDEX idx_player_id (player_id),
  INDEX idx_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scoring_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_count INT NOT NULL UNIQUE,
  pos1_points DECIMAL(8,2) NOT NULL,
  pos2_points DECIMAL(8,2) NOT NULL,
  pos3_points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  pos4_points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  username VARCHAR(100) NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NULL,
  details TEXT NULL,
  ip_address VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS championship_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  league_id INT NOT NULL DEFAULT 1,
  month VARCHAR(7) NOT NULL,
  winner_player_ids TEXT NOT NULL,
  winning_average DECIMAL(8,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_league_month (league_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial default AC Ludo League 1
INSERT IGNORE INTO leagues (id, name, code, description, is_active, is_default) VALUES
(1, 'AC Ludo League 1', 'AC-LUDO-1', 'The primary competitive Ludo championship league.', 1, 1);

-- Initial default scoring rules
INSERT IGNORE INTO scoring_rules (player_count, pos1_points, pos2_points, pos3_points, pos4_points) VALUES
(4, 50.00, 30.00, 20.00, 0.00),
(3, 62.50, 37.50, 0.00, 0.00),
(2, 100.00, 0.00, 0.00, 0.00);

-- Initial default settings
INSERT IGNORE INTO application_settings (setting_key, setting_value) VALUES
('min_matches_qualification', '8'),
('app_name', 'Ludo League Master'),
('timezone', 'Asia/Kolkata'),
('closed_months', '[]');
