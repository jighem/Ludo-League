import { Router } from 'express';
import { query, execute, transaction } from '../db';
import { authenticateToken, optionalAuthenticateToken, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// List all leagues (with match and player summary count)
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let whereClause = '';
    const params: any[] = [];

    if (status === 'active') {
      whereClause = 'WHERE l.is_active = 1';
    } else if (status === 'inactive') {
      whereClause = 'WHERE l.is_active = 0';
    }

    const sql = `
      SELECT
        l.id,
        l.name,
        l.code,
        l.description,
        l.is_active,
        l.is_default,
        l.created_at,
        l.updated_at,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 THEN m.id END) as total_matches,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 THEN mr.player_id END) as active_players_count
      FROM leagues l
      LEFT JOIN matches m ON l.id = m.league_id
      LEFT JOIN match_results mr ON m.id = mr.match_id
      ${whereClause}
      GROUP BY l.id, l.name, l.code, l.description, l.is_active, l.is_default, l.created_at, l.updated_at
      ORDER BY l.is_default DESC, l.id ASC
    `;

    const leagues = await query<any>(sql, params);

    return res.json({ leagues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get single league details
router.get('/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const leagueId = Number(req.params.id);
    if (!leagueId || isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid league ID' });
    }

    const sql = `
      SELECT
        l.*,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 THEN m.id END) as total_matches,
        COUNT(DISTINCT CASE WHEN m.is_deleted = 0 THEN mr.player_id END) as active_players_count
      FROM leagues l
      LEFT JOIN matches m ON l.id = m.league_id
      LEFT JOIN match_results mr ON m.id = mr.match_id
      WHERE l.id = ?
      GROUP BY l.id
    `;

    const rows = await query<any>(sql, [leagueId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    return res.json({ league: rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create new league (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, code, description, is_default } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'League name is required' });
    }

    // Auto-generate or sanitize code
    let leagueCode = (code || name).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-');
    if (!leagueCode) {
      leagueCode = `LEAGUE-${Date.now()}`;
    }

    // Check duplicate name or code
    const existing = await query<any>('SELECT id FROM leagues WHERE name = ? OR code = ?', [name.trim(), leagueCode]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A league with this name or code already exists' });
    }

    const isDefaultVal = is_default ? 1 : 0;

    const result = await transaction(async (tx) => {
      if (isDefaultVal === 1) {
        // Reset previous default
        await tx.execute('UPDATE leagues SET is_default = 0');
      }

      const insertRes = await tx.execute(
        `INSERT INTO leagues (name, code, description, is_active, is_default, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [name.trim(), leagueCode, description?.trim() || null, isDefaultVal]
      );

      return insertRes.insertId;
    });

    await logAudit(req, 'CREATE_LEAGUE', 'leagues', result, { name: name.trim(), code: leagueCode });

    return res.status(201).json({
      message: 'League created successfully',
      leagueId: result,
      name: name.trim(),
      code: leagueCode
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update league (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const leagueId = Number(req.params.id);
    const { name, code, description, is_active, is_default } = req.body;

    if (!leagueId || isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid league ID' });
    }

    const existing = await query<any>('SELECT * FROM leagues WHERE id = ?', [leagueId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'League not found' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'League name is required' });
    }

    let leagueCode = (code || existing[0].code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-');

    // Check conflict
    const conflict = await query<any>('SELECT id FROM leagues WHERE (name = ? OR code = ?) AND id != ?', [
      name.trim(),
      leagueCode,
      leagueId
    ]);
    if (conflict.length > 0) {
      return res.status(409).json({ error: 'Another league with this name or code already exists' });
    }

    const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active;
    const defaultVal = is_default !== undefined ? (is_default ? 1 : 0) : existing[0].is_default;

    await transaction(async (tx) => {
      if (defaultVal === 1) {
        await tx.execute('UPDATE leagues SET is_default = 0 WHERE id != ?', [leagueId]);
      }
      await tx.execute(
        `UPDATE leagues
         SET name = ?, code = ?, description = ?, is_active = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name.trim(), leagueCode, description !== undefined ? description?.trim() || null : existing[0].description, activeVal, defaultVal, leagueId]
      );
    });

    await logAudit(req, 'UPDATE_LEAGUE', 'leagues', leagueId, { name: name.trim(), code: leagueCode, is_active: activeVal, is_default: defaultVal });

    return res.json({ message: 'League updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Set default league (Admin only)
router.post('/:id/set-default', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const leagueId = Number(req.params.id);
    if (!leagueId || isNaN(leagueId)) {
      return res.status(400).json({ error: 'Invalid league ID' });
    }

    await transaction(async (tx) => {
      await tx.execute('UPDATE leagues SET is_default = 0');
      await tx.execute('UPDATE leagues SET is_default = 1 WHERE id = ?', [leagueId]);
    });

    await logAudit(req, 'SET_DEFAULT_LEAGUE', 'leagues', leagueId);

    return res.json({ message: 'Default league updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
