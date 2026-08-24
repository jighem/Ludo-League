import { Router } from 'express';
import { query, execute } from '../db';
import { authenticateToken, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// Get settings and scoring rules
router.get('/', async (req, res) => {
  try {
    const settingsRows = await query<any>('SELECT setting_key, setting_value FROM application_settings');
    const settings: Record<string, string> = {};
    settingsRows.forEach((r) => {
      settings[r.setting_key] = r.setting_value;
    });

    const scoringRules = await query<any>('SELECT * FROM scoring_rules ORDER BY player_count DESC');

    return res.json({
      settings: {
        minMatchesQualification: Number(settings.min_matches_qualification || 8),
        appName: settings.app_name || 'Ludo League',
        timezone: settings.timezone || 'Asia/Kolkata',
        closedMonths: JSON.parse(settings.closed_months || '[]')
      },
      scoringRules
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Application Settings (Admin only)
const handleUpdateSettings = async (req: AuthenticatedRequest, res: any) => {
  try {
    const { minMatchesQualification, appName, timezone, closedMonths } = req.body;

    if (minMatchesQualification !== undefined) {
      const minM = Number(minMatchesQualification);
      if (isNaN(minM) || minM < 1) {
        return res.status(400).json({ error: 'Minimum qualification matches must be at least 1' });
      }
      await execute(
        'INSERT INTO application_settings (setting_key, setting_value) VALUES ("min_matches_qualification", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [String(minM), String(minM)]
      );
    }

    if (appName && typeof appName === 'string') {
      await execute(
        'INSERT INTO application_settings (setting_key, setting_value) VALUES ("app_name", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [appName.trim(), appName.trim()]
      );
    }

    if (timezone && typeof timezone === 'string') {
      await execute(
        'INSERT INTO application_settings (setting_key, setting_value) VALUES ("timezone", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [timezone.trim(), timezone.trim()]
      );
    }

    if (closedMonths && Array.isArray(closedMonths)) {
      const jsonStr = JSON.stringify(closedMonths);
      await execute(
        'INSERT INTO application_settings (setting_key, setting_value) VALUES ("closed_months", ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [jsonStr, jsonStr]
      );
    }

    await logAudit(req, 'UPDATE_APP_SETTINGS', 'application_settings', 'all', req.body);

    return res.json({ message: 'Settings updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/', authenticateToken, requireRole(['admin']), handleUpdateSettings);
router.put('/', authenticateToken, requireRole(['admin']), handleUpdateSettings);
router.post('/app', authenticateToken, requireRole(['admin']), handleUpdateSettings);
router.put('/app', authenticateToken, requireRole(['admin']), handleUpdateSettings);

// Update Scoring Rules (Admin only)
router.put('/scoring-rules', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { rules } = req.body; // Array of { player_count, pos1_points, pos2_points, pos3_points, pos4_points }

    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({ error: 'Rules array is required' });
    }

    // Validation according to #76
    for (const rule of rules) {
      const pCount = Number(rule.player_count);
      const pos1 = Number(rule.pos1_points);
      const pos2 = Number(rule.pos2_points);
      const pos3 = Number(rule.pos3_points || 0);
      const pos4 = Number(rule.pos4_points || 0);

      if (![2, 3, 4].includes(pCount)) {
        return res.status(400).json({ error: 'Player count must be 2, 3, or 4' });
      }

      if (pos1 < 0 || pos2 < 0 || pos3 < 0 || pos4 < 0) {
        return res.status(400).json({ error: 'Points cannot be negative' });
      }

      const total = pos1 + pos2 + pos3 + pos4;
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ error: `Total points for ${pCount}-player match must sum up to exactly 100. Current sum: ${total}` });
      }

      if (pos1 <= pos2) {
        return res.status(400).json({ error: `1st place points must be strictly greater than 2nd place points for ${pCount}-player games` });
      }
    }

    for (const rule of rules) {
      const pCount = Number(rule.player_count);
      const pos1 = Number(rule.pos1_points);
      const pos2 = Number(rule.pos2_points);
      const pos3 = Number(rule.pos3_points || 0);
      const pos4 = Number(rule.pos4_points || 0);

      await execute(
        `INSERT INTO scoring_rules (player_count, pos1_points, pos2_points, pos3_points, pos4_points, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE pos1_points = ?, pos2_points = ?, pos3_points = ?, pos4_points = ?, updated_at = CURRENT_TIMESTAMP`,
        [pCount, pos1, pos2, pos3, pos4, pos1, pos2, pos3, pos4]
      );
    }

    await logAudit(req, 'UPDATE_SCORING_RULES', 'scoring_rules', 'all', { rules });

    return res.json({ message: 'Scoring rules updated successfully. Note: Historical matches retain their original scored points.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
