import { Router } from 'express';
import { query, execute } from '../db';
import { authenticateToken, optionalAuthenticateToken, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// List players with optional search and active status filter
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT p.*,
        (SELECT COUNT(*) FROM match_results mr JOIN matches m ON mr.match_id = m.id WHERE mr.player_id = p.id AND m.is_deleted = 0) as total_matches,
        (SELECT COALESCE(SUM(mr.kills), 0) FROM match_results mr JOIN matches m ON mr.match_id = m.id WHERE mr.player_id = p.id AND m.is_deleted = 0) as total_kills,
        (SELECT COALESCE(SUM(mr.deaths), 0) FROM match_results mr JOIN matches m ON mr.match_id = m.id WHERE mr.player_id = p.id AND m.is_deleted = 0) as total_deaths
      FROM players p
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status === 'active') {
      sql += ' AND p.is_active = 1';
    } else if (status === 'inactive') {
      sql += ' AND p.is_active = 0';
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (p.full_name LIKE ? OR p.nickname LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY p.full_name ASC';

    const players = await query<any>(sql, params);
    return res.json({ players });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Ensure a player exists by name (case-insensitive) or create one (useful for bots/guests)
router.post('/ensure', optionalAuthenticateToken, async (req, res) => {
  try {
    const { name, nickname } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    const cleanName = String(name).trim();
    const existing = await query<any>('SELECT * FROM players WHERE LOWER(full_name) = LOWER(?)', [cleanName]);
    if (existing.length > 0) {
      return res.json({ player: existing[0], created: false });
    }
    const dateJoined = new Date().toISOString().split('T')[0];
    const result = await execute(
      `INSERT INTO players (full_name, nickname, date_joined, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [cleanName, nickname ? String(nickname).trim() : null, dateJoined]
    );
    const newPlayer = {
      id: result.insertId,
      full_name: cleanName,
      nickname: nickname ? String(nickname).trim() : null,
      date_joined: dateJoined,
      is_active: 1
    };
    return res.json({ player: newPlayer, created: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get single player
router.get('/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const playerId = Number(req.params.id);
    const players = await query<any>('SELECT * FROM players WHERE id = ?', [playerId]);
    if (players.length === 0) return res.status(404).json({ error: 'Player not found' });
    return res.json({ player: players[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add new player (Admin / Operator)
router.post('/', authenticateToken, requireRole(['admin', 'operator']), async (req: AuthenticatedRequest, res) => {
  try {
    const { full_name, nickname, profile_photo, mobile_number, email, date_joined } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const dateJoined = date_joined || new Date().toISOString().split('T')[0];

    // Check duplicate name
    const existing = await query<any>('SELECT id FROM players WHERE LOWER(full_name) = LOWER(?)', [full_name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'A player with this name already exists' });
    }

    const result = await execute(
      `INSERT INTO players (full_name, nickname, profile_photo, mobile_number, email, date_joined, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        full_name.trim(),
        nickname?.trim() || null,
        profile_photo || null,
        mobile_number?.trim() || null,
        email?.trim() || null,
        dateJoined
      ]
    );

    const newPlayer = {
      id: result.insertId,
      full_name: full_name.trim(),
      nickname: nickname?.trim() || null,
      profile_photo: profile_photo || null,
      mobile_number: mobile_number?.trim() || null,
      email: email?.trim() || null,
      date_joined: dateJoined,
      is_active: 1
    };

    await logAudit(req, 'CREATE_PLAYER', 'players', result.insertId, { full_name });

    return res.json({
      message: 'Player registered successfully',
      player: newPlayer
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Edit player
router.put('/:id', authenticateToken, requireRole(['admin', 'operator']), async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = Number(req.params.id);
    const { full_name, nickname, profile_photo, mobile_number, email, date_joined, is_active } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // Check duplicate name on other players
    const existing = await query<any>('SELECT id FROM players WHERE LOWER(full_name) = LOWER(?) AND id != ?', [full_name.trim(), playerId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Another player with this name already exists' });
    }

    await execute(
      `UPDATE players
       SET full_name = ?, nickname = ?, profile_photo = ?, mobile_number = ?, email = ?, date_joined = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        full_name.trim(),
        nickname?.trim() || null,
        profile_photo || null,
        mobile_number?.trim() || null,
        email?.trim() || null,
        date_joined,
        is_active ? 1 : 0,
        playerId
      ]
    );

    await logAudit(req, 'UPDATE_PLAYER', 'players', playerId, { full_name, is_active });

    return res.json({ message: 'Player updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Toggle player active/inactive status (Admin only)
router.patch('/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const playerId = Number(req.params.id);
    const { is_active } = req.body;

    await execute('UPDATE players SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [is_active ? 1 : 0, playerId]);

    await logAudit(req, 'TOGGLE_PLAYER_STATUS', 'players', playerId, { is_active });

    return res.json({ message: `Player ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
