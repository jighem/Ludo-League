# Ludo League — Installation & Database Documentation

This repository contains the complete codebase, database schemas, and configuration for **Ludo League**, a modern, responsive tournament, leaderboard, and match analytics web platform.

---

## 1. System Overview & Architecture

- **Runtime Environment:** Node.js 18.x or higher (npm v9+)
- **Application Server:** Express (TypeScript compiled to CommonJS via `esbuild`) listening on Port `3000`
- **Frontend Framework:** React 19, Vite 6, Tailwind CSS v4, Recharts, Lucide Icons
- **Database Engine Support:**
  - **Production:** MySQL 8+ / MariaDB 10.5+
  - **Development / Standalone:** Embedded file-backed SQLite database (`data/ludo_league.sqlite`) powered by `sql.js`

---

## 2. Complete Database Schema

### MySQL 8+ DDL Script (`server/schema.sql`)

```sql
-- ============================================================
-- Ludo League Complete MySQL 8+ Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS `ludo_league` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `ludo_league`;

-- 1. System Administrative & Operator Accounts
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'viewer', -- 'admin', 'operator', or 'viewer'
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. League Player Profiles
CREATE TABLE IF NOT EXISTS `players` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `nickname` VARCHAR(50) NULL,
  `profile_photo` LONGTEXT NULL,
  `mobile_number` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `date_joined` DATE NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Match Records
CREATE TABLE IF NOT EXISTS `matches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `friendly_id` VARCHAR(30) NOT NULL UNIQUE, -- e.g. MATCH-202608-001
  `match_date` DATE NOT NULL,
  `match_time` TIME NOT NULL,
  `player_count` INT NOT NULL, -- 2, 3, or 4 players
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_by` INT NULL,
  `deleted_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_match_date` (`match_date`),
  INDEX `idx_is_deleted` (`is_deleted`),
  INDEX `idx_player_count` (`player_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Match Player Results & Points Allocation
CREATE TABLE IF NOT EXISTS `match_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `match_id` INT NOT NULL,
  `player_id` INT NOT NULL,
  `position` INT NOT NULL, -- Finishing Rank: 1, 2, 3, or 4
  `points_awarded` DECIMAL(8,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_match` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_player` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`),
  UNIQUE KEY `idx_match_player` (`match_id`, `player_id`),
  UNIQUE KEY `idx_match_position` (`match_id`, `position`),
  INDEX `idx_player_id` (`player_id`),
  INDEX `idx_position` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Customizable Scoring Rules (Per match size)
CREATE TABLE IF NOT EXISTS `scoring_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `player_count` INT NOT NULL UNIQUE,
  `pos1_points` DECIMAL(8,2) NOT NULL,
  `pos2_points` DECIMAL(8,2) NOT NULL,
  `pos3_points` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `pos4_points` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Global Application Configurations
CREATE TABLE IF NOT EXISTS `application_settings` (
  `setting_key` VARCHAR(50) PRIMARY KEY,
  `setting_value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Audit Trail Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `username` VARCHAR(100) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Historical Monthly Championship Snapshots
CREATE TABLE IF NOT EXISTS `championship_snapshots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `month` VARCHAR(7) NOT NULL UNIQUE, -- e.g. "2026-08"
  `winner_player_ids` TEXT NOT NULL, -- JSON array string of winning player IDs
  `winning_average` DECIMAL(8,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data & Configuration Defaults
-- ============================================================

INSERT IGNORE INTO `scoring_rules` 
  (`player_count`, `pos1_points`, `pos2_points`, `pos3_points`, `pos4_points`) 
VALUES
  (4, 50.00, 30.00, 20.00, 0.00),
  (3, 62.50, 37.50, 0.00, 0.00),
  (2, 100.00, 0.00, 0.00, 0.00);

INSERT IGNORE INTO `application_settings` 
  (`setting_key`, `setting_value`) 
VALUES
  ('min_matches_qualification', '8'),
  ('app_name', 'Ludo League'),
  ('timezone', 'Asia/Kolkata'),
  ('closed_months', '[]');
```

---

### SQLite DDL Script (Embedded Engine)

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  nickname TEXT,
  profile_photo TEXT,
  mobile_number TEXT,
  email TEXT,
  date_joined DATE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  friendly_id TEXT NOT NULL UNIQUE,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  player_count INTEGER NOT NULL,
  notes TEXT,
  created_by INTEGER,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by INTEGER,
  deleted_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  points_awarded DECIMAL(8,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (match_id, player_id),
  UNIQUE (match_id, position)
);

CREATE TABLE IF NOT EXISTS scoring_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_count INTEGER NOT NULL UNIQUE,
  pos1_points DECIMAL(8,2) NOT NULL,
  pos2_points DECIMAL(8,2) NOT NULL,
  pos3_points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  pos4_points DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS championship_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE,
  winner_player_ids TEXT NOT NULL,
  winning_average DECIMAL(8,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO scoring_rules (player_count, pos1_points, pos2_points, pos3_points, pos4_points) VALUES
(4, 50.00, 30.00, 20.00, 0.00),
(3, 62.50, 37.50, 0.00, 0.00),
(2, 100.00, 0.00, 0.00, 0.00);

INSERT OR IGNORE INTO application_settings (setting_key, setting_value) VALUES
('min_matches_qualification', '8'),
('app_name', 'Ludo League'),
('timezone', 'Asia/Kolkata'),
('closed_months', '[]');
```

---

## 3. Installation & Deployment Guide

### Step 1: Environment Setup (`.env`)

Create a `.env` file in the project root:

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Optional: MySQL Credentials (Defaults to embedded database if unconfigured)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=ludo_user
MYSQL_PASSWORD=ludo_password
MYSQL_DATABASE=ludo_league
```

---

### Step 2: Install Package Dependencies

```bash
npm install
```

---

### Step 3: Build Application

```bash
npm run build
```

---

### Step 4: Start Application Server

```bash
npm run start
```

Access the app in your browser at `http://localhost:3000`.

---

### Step 5: PM2 Process Management (Production VPS Deployment)

```bash
npm install -g pm2
pm2 start dist/server.cjs --name "ludo-league"
pm2 save
pm2 startup
```

---

## 4. Plesk Control Panel Installation Guide

If you are hosting **Ludo League** on a web host or VPS managed with **Plesk Obsidian / Onyx**, follow these steps to deploy the application via Plesk's built-in **Node.js** and **Database** managers:

### Step 1: Create Database in Plesk
1. Log in to your **Plesk Control Panel**.
2. Navigate to **Databases** in the left sidebar and click **Add Database**.
3. Set **Database Name** (e.g., `ludo_league`), **Database User Name**, and **Password**.
4. Once created, click **Import Dump** (or open **phpMyAdmin**) and select the `server/schema.sql` file provided in this repository to populate the schema and initial seed data.

### Step 2: Enable & Configure Node.js for Domain
1. In Plesk, go to **Websites & Domains** and select your target domain/subdomain (`ludo.udaanhost.com`).
2. Click on the **Node.js** icon.
3. Set the following Node.js configurations:
   - **Node.js Version:** Select **18.x**, **20.x**, or **24.x**
   - **Application Mode:** `production`
   - **Application Root:** `/ludo.udaanhost.com` (your domain folder)
   - **Document Root:** `/ludo.udaanhost.com/dist` *(CRITICAL: Must point to `/dist` so Plesk serves the compiled static build rather than the uncompiled source `index.html`)*
   - **Application Startup File:** `dist/server.cjs`
4. Under **Environment Variables** (`[specify]`), add:
   - `JWT_SECRET` = `your_secure_jwt_secret_here`
   - `MYSQL_HOST` = `127.0.0.1` (or `localhost` for local Plesk MySQL)
   - `MYSQL_PORT` = `3306`
   - `MYSQL_USER` = `ludo_score`
   - `MYSQL_PASSWORD` = `your_db_password`
   - `MYSQL_DATABASE` = `ludo_score`

### Step 3: Deploy, Build & Launch
1. Upload/pull the updated source files (including `server.ts` and `server/db.ts`) into your domain's folder.
2. In the Plesk **Node.js** control panel:
   - Click **+ NPM install** to install all required modules.
   - Click **▷ Run script** -> type `build` to generate the compiled `dist/` frontend and `dist/server.cjs`.
   - Click **↺ Restart App** to start the application.

### Step 4: Restart & Test Application
1. Click **Restart App** in the Plesk Node.js panel.
2. Open your website domain in a web browser.
3. If this is the initial launch on a new database, the **First-Time Administrator Setup** prompt will appear automatically to let you register the primary admin account.

