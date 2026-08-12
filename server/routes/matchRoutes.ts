import { Router } from 'express';
import { query, transaction } from '../db';
import { authenticateToken, optionalAuthenticateToken, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// Helper to get scoring rule for player count
async function getScoringRules(playerCount: number) {
  const rules = await query<any>('SELECT * FROM scoring_rules WHERE player_count = ?', [playerCount]);
  if (rules.length > 0) {
    return {
      1: Number(rules[0].pos1_points),
      2: Number(rules[0].pos2_points),
      3: Number(rules[0].pos3_points),
      4: Number(rules[0].pos4_points)
    };
  }

  // Fallback defaults
  if (playerCount === 4) return { 1: 50.0, 2: 30.0, 3: 20.0, 4: 0.0 };
  if (playerCount === 3) return { 1: 62.5, 2: 37.5, 3: 0.0, 4: 0.0 };
  if (playerCount === 2) return { 1: 100.0, 2: 0.0, 3: 0.0, 4: 0.0 };
  throw new Error(`Invalid player count: ${playerCount}`);
}

// Generate friendly match ID like #MATCH-000001
async function generateFriendlyId(): Promise<string> {
  const maxRes = await query<{ max_id: number }>('SELECT MAX(id) as max_id FROM matches');
  const nextNum = (maxRes[0]?.max_id || 0) + 1;
  const pad = String(nextNum).padStart(6, '0');
  return `#MATCH-${pad}`;
}

// Check for suspicious recent duplicate match
router.post('/check-duplicate', authenticateToken, async (req, res) => {
  try {
    const { match_date, player_count, results } = req.body;
    if (!results || !Array.isArray(results)) return res.json({ isPossibleDuplicate: false });

    const playerIds = results.map((r: any) => Number(r.player_id)).sort();

    // Find matches on same date with same player count
    const matchesOnDate = await query<any>(
      'SELECT id, friendly_id, match_time FROM matches WHERE match_date = ? AND player_count = ? AND is_deleted = 0 ORDER BY id DESC LIMIT 5',
      [match_date, player_count]
    );

    for (const m of matchesOnDate) {
      const matchRes = await query<any>(
        'SELECT player_id, position FROM match_results WHERE match_id = ? ORDER BY player_id',
        [m.id]
      );
      const existingIds = matchRes.map((r: any) => Number(r.player_id)).sort();

      if (JSON.stringify(playerIds) === JSON.stringify(existingIds)) {
        // Check exact positions match too
        let identicalPositions = true;
        for (const r of results) {
          const matched = matchRes.find((x: any) => Number(x.player_id) === Number(r.player_id));
          if (!matched || Number(matched.position) !== Number(r.position)) {
            identicalPositions = false;
            break;
          }
        }
        if (identicalPositions) {
          return res.json({
            isPossibleDuplicate: true,
            existingMatchId: m.friendly_id,
            matchTime: m.match_time
          });
        }
      }
    }

    return res.json({ isPossibleDuplicate: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create new match (Transactional)
router.post('/', authenticateToken, requireRole(['admin', 'operator']), async (req: AuthenticatedRequest, res) => {
  try {
    const { match_date, match_time, player_count, notes, results } = req.body;

    // Validations
    if (!match_date || !match_time) {
      return res.status(400).json({ error: 'Match date and time are required' });
    }

    const pCount = Number(player_count);
    if (![2, 3, 4].includes(pCount)) {
      return res.status(400).json({ error: 'Player count must be 2, 3, or 4' });
    }

    if (!results || !Array.isArray(results) || results.length !== pCount) {
      return res.status(400).json({ error: `Exactly ${pCount} player results must be provided` });
    }

    // Check unique players and unique ranks
    const playerIds = new Set<number>();
    const positions = new Set<number>();

    for (const r of results) {
      const pid = Number(r.player_id);
      const pos = Number(r.position);

      if (!pid || isNaN(pid)) {
        return res.status(400).json({ error: 'Invalid player selection' });
      }
      if (!pos || isNaN(pos) || pos < 1 || pos > pCount) {
        return res.status(400).json({ error: `Position must be between 1 and ${pCount}` });
      }

      if (playerIds.has(pid)) {
        return res.status(400).json({ error: 'The same player cannot be selected twice in one match' });
      }
      if (positions.has(pos)) {
        return res.status(400).json({ error: 'Each player must have a unique finishing rank' });
      }

      playerIds.add(pid);
      positions.add(pos);
    }

    // Check month closure
    const monthStr = match_date.substring(0, 7);
    const settings = await query<any>('SELECT setting_value FROM application_settings WHERE setting_key = "closed_months"');
    if (settings.length > 0) {
      const closedMonths: string[] = JSON.parse(settings[0].setting_value || '[]');
      if (closedMonths.includes(monthStr) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: `Month ${monthStr} is closed for new entries by administrator.` });
      }
    }

    // Fetch current scoring rules
    const pointsMap = await getScoringRules(pCount);
    const friendlyId = await generateFriendlyId();
    const createdBy = req.user?.id || null;

    // Transaction execution
    const newMatchId = await transaction(async (tx) => {
      const mRes = await tx.execute(
        `INSERT INTO matches (friendly_id, match_date, match_time, player_count, notes, created_by, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [friendlyId, match_date, match_time, pCount, notes?.trim() || null, createdBy]
      );

      const matchId = mRes.insertId;

      for (const r of results) {
        const pid = Number(r.player_id);
        const pos = Number(r.position);
        const points = pointsMap[pos as keyof typeof pointsMap] || 0.0;

        await tx.execute(
          `INSERT INTO match_results (match_id, player_id, position, points_awarded, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [matchId, pid, pos, points]
        );
      }

      return matchId;
    });

    await logAudit(req, 'CREATE_MATCH', 'matches', newMatchId, { friendlyId, match_date, player_count: pCount });

    return res.json({
      message: 'Match saved successfully',
      matchId: newMatchId,
      friendlyId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List matches (paginated, with search/date filter)
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { startDate, endDate, month, year, playerId, playerCount } = req.query;

    let whereClause = 'WHERE m.is_deleted = 0';
    const params: any[] = [];

    if (startDate && typeof startDate === 'string') {
      whereClause += ' AND m.match_date >= ?';
      params.push(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      whereClause += ' AND m.match_date <= ?';
      params.push(endDate);
    }
    if (month && typeof month === 'string') {
      whereClause += ' AND m.match_date LIKE ?';
      params.push(`${month}%`);
    }
    if (year && typeof year === 'string') {
      whereClause += ' AND m.match_date LIKE ?';
      params.push(`${year}%`);
    }
    if (playerCount && !isNaN(Number(playerCount))) {
      whereClause += ' AND m.player_count = ?';
      params.push(Number(playerCount));
    }
    if (playerId && !isNaN(Number(playerId))) {
      whereClause += ' AND m.id IN (SELECT match_id FROM match_results WHERE player_id = ?)';
      params.push(Number(playerId));
    }

    const countRes = await query<any>(`SELECT COUNT(*) as total FROM matches m ${whereClause}`, params);
    const total = countRes[0]?.total || 0;

    const sql = `
      SELECT m.*, u.name as created_by_name
      FROM matches m
      LEFT JOIN users u ON m.created_by = u.id
      ${whereClause}
      ORDER BY m.match_date DESC, m.match_time DESC, m.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const matches = await query<any>(sql, params);

    // Fetch results for listed matches
    if (matches.length > 0) {
      const matchIds = matches.map((m) => m.id);
      const placeholders = matchIds.map(() => '?').join(',');
      const resultsSql = `
        SELECT mr.*, p.full_name as player_name, p.nickname as player_nickname, p.profile_photo
        FROM match_results mr
        JOIN players p ON mr.player_id = p.id
        WHERE mr.match_id IN (${placeholders})
        ORDER BY mr.match_id ASC, mr.position ASC
      `;
      const allResults = await query<any>(resultsSql, matchIds);

      matches.forEach((m) => {
        m.results = allResults.filter((r) => r.match_id === m.id);
      });
    }

    return res.json({
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get match by ID
router.get('/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const matchId = Number(req.params.id);
    const matches = await query<any>(
      `SELECT m.*, u.name as created_by_name FROM matches m LEFT JOIN users u ON m.created_by = u.id WHERE m.id = ? AND m.is_deleted = 0`,
      [matchId]
    );

    if (matches.length === 0) return res.status(404).json({ error: 'Match not found' });

    const results = await query<any>(
      `SELECT mr.*, p.full_name as player_name, p.nickname as player_nickname, p.profile_photo
       FROM match_results mr
       JOIN players p ON mr.player_id = p.id
       WHERE mr.match_id = ?
       ORDER BY mr.position ASC`,
      [matchId]
    );

    const match = matches[0];
    match.results = results;

    return res.json({ match });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Edit match (Transactional)
router.put('/:id', authenticateToken, requireRole(['admin', 'operator']), async (req: AuthenticatedRequest, res) => {
  try {
    const matchId = Number(req.params.id);
    const { match_date, match_time, player_count, notes, results } = req.body;

    const existingMatch = await query<any>('SELECT * FROM matches WHERE id = ? AND is_deleted = 0', [matchId]);
    if (existingMatch.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const pCount = Number(player_count);
    if (![2, 3, 4].includes(pCount)) {
      return res.status(400).json({ error: 'Player count must be 2, 3, or 4' });
    }

    if (!results || !Array.isArray(results) || results.length !== pCount) {
      return res.status(400).json({ error: `Exactly ${pCount} player results must be provided` });
    }

    // Check unique players and unique ranks
    const playerIds = new Set<number>();
    const positions = new Set<number>();

    for (const r of results) {
      const pid = Number(r.player_id);
      const pos = Number(r.position);

      if (!pid || isNaN(pid)) return res.status(400).json({ error: 'Invalid player selection' });
      if (!pos || isNaN(pos) || pos < 1 || pos > pCount) return res.status(400).json({ error: 'Invalid position' });

      if (playerIds.has(pid)) return res.status(400).json({ error: 'Duplicate player in match' });
      if (positions.has(pos)) return res.status(400).json({ error: 'Duplicate position in match' });

      playerIds.add(pid);
      positions.add(pos);
    }

    const pointsMap = await getScoringRules(pCount);

    await transaction(async (tx) => {
      // Update match record
      await tx.execute(
        `UPDATE matches SET match_date = ?, match_time = ?, player_count = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [match_date, match_time, pCount, notes?.trim() || null, matchId]
      );

      // Replace match results
      await tx.execute('DELETE FROM match_results WHERE match_id = ?', [matchId]);

      for (const r of results) {
        const pid = Number(r.player_id);
        const pos = Number(r.position);
        const points = pointsMap[pos as keyof typeof pointsMap] || 0.0;

        await tx.execute(
          `INSERT INTO match_results (match_id, player_id, position, points_awarded, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [matchId, pid, pos, points]
        );
      }
    });

    await logAudit(req, 'EDIT_MATCH', 'matches', matchId, { friendlyId: existingMatch[0].friendly_id, match_date });

    return res.json({ message: 'Match updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Soft delete match (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const matchId = Number(req.params.id);
    const { reason } = req.body || {};

    const existing = await query<any>('SELECT * FROM matches WHERE id = ? AND is_deleted = 0', [matchId]);
    if (existing.length === 0) return res.status(404).json({ error: 'Match not found' });

    await execute(
      `UPDATE matches SET is_deleted = 1, deleted_by = ?, deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.user?.id || null, matchId]
    );

    await logAudit(req, 'DELETE_MATCH', 'matches', matchId, { friendlyId: existing[0].friendly_id, reason });

    return res.json({ message: 'Match deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
