import { Router } from 'express';
import { query } from '../db';
import { optionalAuthenticateToken } from '../auth';

const router = Router();

// Helper to get minimum matches threshold
async function getMinMatchesThreshold(): Promise<number> {
  const settings = await query<any>('SELECT setting_value FROM application_settings WHERE setting_key = "min_matches_qualification"');
  if (settings.length > 0 && !isNaN(Number(settings[0].setting_value))) {
    return Number(settings[0].setting_value);
  }
  return 8;
}

// Calculate Leaderboard for a given month, year, or all-time
export async function calculateLeaderboard(options: {
  month?: string; // YYYY-MM
  year?: string;  // YYYY
  minMatches?: number;
}) {
  const minQualMatches = options.minMatches !== undefined ? options.minMatches : await getMinMatchesThreshold();

  let dateFilter = '';
  const params: any[] = [];

  if (options.month) {
    dateFilter = 'AND m.match_date LIKE ?';
    params.push(`${options.month}%`);
  } else if (options.year) {
    dateFilter = 'AND m.match_date LIKE ?';
    params.push(`${options.year}%`);
  }

  // Query player performance from match results using LEFT JOIN so all active players are present
  const sql = `
    SELECT
      p.id as player_id,
      p.full_name,
      p.nickname,
      p.profile_photo,
      p.is_active,
      COUNT(m.id) as total_matches,
      COALESCE(SUM(mr.points_awarded), 0) as total_points,
      COALESCE(ROUND(AVG(mr.points_awarded), 2), 0) as average_score,
      COALESCE(ROUND(AVG(mr.position), 2), 0) as average_position,
      SUM(CASE WHEN mr.position = 1 THEN 1 ELSE 0 END) as wins_1st,
      SUM(CASE WHEN mr.position = 2 THEN 1 ELSE 0 END) as pos_2nd,
      SUM(CASE WHEN mr.position = 3 THEN 1 ELSE 0 END) as pos_3rd,
      SUM(CASE WHEN mr.position = 4 THEN 1 ELSE 0 END) as pos_4th,
      SUM(CASE WHEN mr.position = m.player_count THEN 1 ELSE 0 END) as last_place,
      SUM(CASE WHEN mr.position <= 3 THEN 1 ELSE 0 END) as podium_finishes
    FROM players p
    LEFT JOIN match_results mr ON p.id = mr.player_id
    LEFT JOIN matches m ON mr.match_id = m.id AND m.is_deleted = 0 ${dateFilter}
    WHERE p.is_active = 1
    GROUP BY p.id, p.full_name, p.nickname, p.profile_photo, p.is_active
  `;

  const rows = await query<any>(sql, params);

  const leaderboard = rows.map((r) => {
    const totalMatches = Number(r.total_matches) || 0;
    const totalPoints = Number(r.total_points) || 0;
    const avgScore = totalMatches > 0 ? Number((totalPoints / totalMatches).toFixed(2)) : 0;
    const avgPos = totalMatches > 0 ? Number((Number(r.average_position)).toFixed(2)) : 0;
    const wins = Number(r.wins_1st) || 0;
    const pos2 = Number(r.pos_2nd) || 0;
    const pos3 = Number(r.pos_3rd) || 0;
    const pos4 = Number(r.pos_4th) || 0;
    const lastPlace = Number(r.last_place) || 0;
    const podium = Number(r.podium_finishes) || 0;

    const winPct = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(1)) : 0;
    const podiumPct = totalMatches > 0 ? Number(((podium / totalMatches) * 100).toFixed(1)) : 0;
    const isQualified = totalMatches >= minQualMatches;

    return {
      player_id: r.player_id,
      full_name: r.full_name,
      nickname: r.nickname,
      profile_photo: r.profile_photo,
      is_active: r.is_active,
      total_matches: totalMatches,
      total_points: Number(totalPoints.toFixed(2)),
      average_score: avgScore,
      average_position: avgPos,
      wins_1st: wins,
      pos_2nd: pos2,
      pos_3rd: pos3,
      pos_4th: pos4,
      last_place: lastPlace,
      podium_finishes: podium,
      win_pct: winPct,
      podium_pct: podiumPct,
      is_qualified: isQualified,
      rank: 0,
      is_champion: false
    };
  });

  // Sort function implementing Tie-Breaking Rules:
  // Qualified players rank above unqualified players
  // 0. Qualified status (true > false)
  // 1. Higher average score
  // 2. Higher number of 1st-place finishes
  // 3. Higher win percentage
  // 4. Higher number of 2nd-place finishes
  // 5. Higher total matches played
  leaderboard.sort((a, b) => {
    if (a.is_qualified !== b.is_qualified) {
      return a.is_qualified ? -1 : 1;
    }
    if (b.average_score !== a.average_score) {
      return b.average_score - a.average_score;
    }
    if (b.wins_1st !== a.wins_1st) {
      return b.wins_1st - a.wins_1st;
    }
    if (b.win_pct !== a.win_pct) {
      return b.win_pct - a.win_pct;
    }
    if (b.pos_2nd !== a.pos_2nd) {
      return b.pos_2nd - a.pos_2nd;
    }
    return b.total_matches - a.total_matches;
  });

  // Assign ranks & flag champions
  let currentRank = 1;
  const qualifiedList = leaderboard.filter((p) => p.is_qualified);
  const highestQualAvg = qualifiedList.length > 0 ? qualifiedList[0].average_score : null;

  leaderboard.forEach((item) => {
    if (item.is_qualified) {
      item.rank = currentRank;
      currentRank += 1;
      if (highestQualAvg !== null && item.average_score === highestQualAvg) {
        item.is_champion = true;
      }
    } else {
      item.rank = 0;
      item.is_champion = false;
    }
  });

  return leaderboard;
}

// Home Dashboard API
router.get('/dashboard', optionalAuthenticateToken, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // Today matches count
    const todayRes = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM matches WHERE match_date = ? AND is_deleted = 0',
      [todayStr]
    );

    // Month matches count
    const monthRes = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM matches WHERE match_date LIKE ? AND is_deleted = 0',
      [`${currentMonthStr}%`]
    );

    // Active players count
    const activePlayersRes = await query<{ count: number }>('SELECT COUNT(*) as count FROM players WHERE is_active = 1');

    // Latest match
    const latestMatchRes = await query<any>(
      `SELECT m.*, u.name as created_by_name FROM matches m LEFT JOIN users u ON m.created_by = u.id WHERE m.is_deleted = 0 ORDER BY m.match_date DESC, m.match_time DESC, m.id DESC LIMIT 1`
    );

    let latestMatch = null;
    if (latestMatchRes.length > 0) {
      latestMatch = latestMatchRes[0];
      if (latestMatch.match_date && String(latestMatch.match_date).includes('T')) {
        latestMatch.match_date = String(latestMatch.match_date).split('T')[0];
      }
      latestMatch.results = await query<any>(
        `SELECT mr.*, p.full_name as player_name, p.nickname as player_nickname, p.profile_photo
         FROM match_results mr JOIN players p ON mr.player_id = p.id
         WHERE mr.match_id = ? ORDER BY mr.position ASC`,
        [latestMatch.id]
      );
    }

    // Leaderboard for current month
    const leaderboard = await calculateLeaderboard({ month: currentMonthStr });

    // Current leader
    const champions = leaderboard.filter((p) => p.is_champion);
    const firstQual = leaderboard.find((p) => p.is_qualified);
    const leaderName = champions.length > 0
      ? champions.map((c) => c.full_name).join(' & ')
      : (firstQual ? firstQual.full_name : 'None Yet (Qualifying)');
    const leaderAvg = champions.length > 0
      ? champions[0].average_score
      : (firstQual ? firstQual.average_score : 0);

    // Most wins this month
    const sortedByWins = [...leaderboard].sort((a, b) => b.wins_1st - a.wins_1st);
    const mostWinsPlayer = sortedByWins[0] ? `${sortedByWins[0].full_name} (${sortedByWins[0].wins_1st} wins)` : 'N/A';

    // Most active player this month
    const sortedByMatches = [...leaderboard].sort((a, b) => b.total_matches - a.total_matches);
    const mostActivePlayer = sortedByMatches[0] ? `${sortedByMatches[0].full_name} (${sortedByMatches[0].total_matches} games)` : 'N/A';

    // Highest win rate
    const sortedByWinRate = [...leaderboard].filter((p) => p.total_matches >= 3).sort((a, b) => b.win_pct - a.win_pct);
    const highestWinRatePlayer = sortedByWinRate[0] ? `${sortedByWinRate[0].full_name} (${sortedByWinRate[0].win_pct}%)` : 'N/A';

    return res.json({
      summary: {
        matchesToday: todayRes[0]?.count || 0,
        matchesThisMonth: monthRes[0]?.count || 0,
        activePlayers: activePlayersRes[0]?.count || 0,
        currentLeader: leaderName,
        currentLeaderAverage: leaderAvg,
        mostWinsThisMonth: mostWinsPlayer,
        mostActivePlayer,
        highestWinRatePlayer
      },
      latestMatch,
      leaderboard: leaderboard.slice(0, 10), // Top 10 for dashboard
      currentMonth: currentMonthStr
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Leaderboard API (Monthly, Yearly, All-Time)
router.get('/leaderboard', optionalAuthenticateToken, async (req, res) => {
  try {
    const { month, year, minMatches } = req.query;
    const minM = minMatches !== undefined ? Number(minMatches) : undefined;

    const leaderboard = await calculateLeaderboard({
      month: month && typeof month === 'string' ? month : undefined,
      year: year && typeof year === 'string' ? year : undefined,
      minMatches: minM
    });

    const minQualification = await getMinMatchesThreshold();

    return res.json({
      leaderboard,
      minQualificationThreshold: minQualification
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Detailed Player Profile Statistics
router.get('/player/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const playerId = Number(req.params.id);
    const players = await query<any>('SELECT * FROM players WHERE id = ?', [playerId]);
    if (players.length === 0) return res.status(404).json({ error: 'Player not found' });

    const player = players[0];

    // Total matches & points query
    const statsSql = `
      SELECT
        COUNT(mr.id) as total_matches,
        COALESCE(SUM(mr.points_awarded), 0) as total_points,
        ROUND(AVG(mr.points_awarded), 2) as average_score,
        ROUND(AVG(mr.position), 2) as average_position,
        SUM(CASE WHEN mr.position = 1 THEN 1 ELSE 0 END) as wins_1st,
        SUM(CASE WHEN mr.position = 2 THEN 1 ELSE 0 END) as pos_2nd,
        SUM(CASE WHEN mr.position = 3 THEN 1 ELSE 0 END) as pos_3rd,
        SUM(CASE WHEN mr.position = 4 THEN 1 ELSE 0 END) as pos_4th,
        SUM(CASE WHEN mr.position = m.player_count THEN 1 ELSE 0 END) as last_place,
        SUM(CASE WHEN mr.position <= 3 THEN 1 ELSE 0 END) as podium_finishes
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE mr.player_id = ? AND m.is_deleted = 0
    `;
    const statsRes = await query<any>(statsSql, [playerId]);
    const overallStats = statsRes[0] || {};

    const totalMatches = Number(overallStats.total_matches) || 0;
    const totalPoints = Number(overallStats.total_points) || 0;
    const wins = Number(overallStats.wins_1st) || 0;
    const pos2 = Number(overallStats.pos_2nd) || 0;
    const pos3 = Number(overallStats.pos_3rd) || 0;
    const pos4 = Number(overallStats.pos_4th) || 0;
    const lastPlace = Number(overallStats.last_place) || 0;
    const podium = Number(overallStats.podium_finishes) || 0;

    const avgScore = totalMatches > 0 ? Number((totalPoints / totalMatches).toFixed(2)) : 0;
    const avgPos = totalMatches > 0 ? Number(Number(overallStats.average_position).toFixed(2)) : 0;
    const winPct = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(1)) : 0;
    const podiumPct = totalMatches > 0 ? Number(((podium / totalMatches) * 100).toFixed(1)) : 0;

    // Recent form matches (ordered latest first)
    const recentMatchesSql = `
      SELECT mr.position, mr.points_awarded, m.match_date, m.match_time, m.friendly_id, m.player_count
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE mr.player_id = ? AND m.is_deleted = 0
      ORDER BY m.match_date DESC, m.match_time DESC, m.id DESC
      LIMIT 20
    `;
    const rawRecentMatches = await query<any>(recentMatchesSql, [playerId]);
    const recentMatches = rawRecentMatches.map((m) => ({
      ...m,
      match_date: m.match_date && String(m.match_date).includes('T') ? String(m.match_date).split('T')[0] : String(m.match_date || '')
    }));

    // Calculate streaks
    let currentWinStreak = 0;
    let bestWinStreak = 0;
    let tempWinStreak = 0;

    let currentPodiumStreak = 0;
    let bestPodiumStreak = 0;
    let tempPodiumStreak = 0;

    let currentStreakBroken = false;
    let currentPodiumStreakBroken = false;

    for (let i = 0; i < recentMatches.length; i++) {
      const pos = Number(recentMatches[i].position);

      // Win streak logic
      if (pos === 1) {
        if (!currentStreakBroken) currentWinStreak++;
        tempWinStreak++;
        if (tempWinStreak > bestWinStreak) bestWinStreak = tempWinStreak;
      } else {
        currentStreakBroken = true;
        tempWinStreak = 0;
      }

      // Podium streak logic
      if (pos <= 3) {
        if (!currentPodiumStreakBroken) currentPodiumStreak++;
        tempPodiumStreak++;
        if (tempPodiumStreak > bestPodiumStreak) bestPodiumStreak = tempPodiumStreak;
      } else {
        currentPodiumStreakBroken = true;
        tempPodiumStreak = 0;
      }
    }

    // Performance by Game Size (4P, 3P, 2P)
    const bySizeSql = `
      SELECT
        m.player_count,
        COUNT(mr.id) as matches,
        COALESCE(SUM(mr.points_awarded), 0) as points,
        SUM(CASE WHEN mr.position = 1 THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(mr.position), 2) as avg_pos
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE mr.player_id = ? AND m.is_deleted = 0
      GROUP BY m.player_count
    `;
    const bySizeRows = await query<any>(bySizeSql, [playerId]);
    const performanceBySize = {
      4: { matches: 0, wins: 0, points: 0, avg_score: 0, win_pct: 0, avg_pos: 0 },
      3: { matches: 0, wins: 0, points: 0, avg_score: 0, win_pct: 0, avg_pos: 0 },
      2: { matches: 0, wins: 0, points: 0, avg_score: 0, win_pct: 0, avg_pos: 0 }
    };

    bySizeRows.forEach((r) => {
      const pCount = Number(r.player_count) as 2 | 3 | 4;
      const mCount = Number(r.matches) || 0;
      const pts = Number(r.points) || 0;
      const wCount = Number(r.wins) || 0;
      if (performanceBySize[pCount]) {
        performanceBySize[pCount] = {
          matches: mCount,
          wins: wCount,
          points: Number(pts.toFixed(2)),
          avg_score: mCount > 0 ? Number((pts / mCount).toFixed(2)) : 0,
          win_pct: mCount > 0 ? Number(((wCount / mCount) * 100).toFixed(1)) : 0,
          avg_pos: Number(r.avg_pos) || 0
        };
      }
    });

    // Monthly Performance History
    const monthlyHistorySql = `
      SELECT
        SUBSTRING(m.match_date, 1, 7) as month,
        COUNT(mr.id) as matches,
        COALESCE(SUM(mr.points_awarded), 0) as points,
        SUM(CASE WHEN mr.position = 1 THEN 1 ELSE 0 END) as wins
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE mr.player_id = ? AND m.is_deleted = 0
      GROUP BY SUBSTRING(m.match_date, 1, 7)
      ORDER BY month DESC
    `;
    const monthlyHistoryRows = await query<any>(monthlyHistorySql, [playerId]);
    const monthlyPerformance = monthlyHistoryRows.map((r) => {
      const m = Number(r.matches) || 0;
      const p = Number(r.points) || 0;
      const w = Number(r.wins) || 0;
      return {
        month: r.month,
        matches: m,
        points: Number(p.toFixed(2)),
        wins: w,
        average_score: m > 0 ? Number((p / m).toFixed(2)) : 0,
        win_pct: m > 0 ? Number(((w / m) * 100).toFixed(1)) : 0
      };
    });

    // Current month rank
    const currentMonthStr = new Date().toISOString().split('T')[0].substring(0, 7);
    const currMonthLeaderboard = await calculateLeaderboard({ month: currentMonthStr });
    const currRankItem = currMonthLeaderboard.find((p) => p.player_id === playerId);

    return res.json({
      player,
      summary: {
        totalMatches,
        totalPoints: Number(totalPoints.toFixed(2)),
        averageScore: avgScore,
        averagePosition: avgPos,
        wins,
        pos2,
        pos3,
        pos4,
        lastPlace,
        podiumFinishes: podium,
        winPercentage: winPct,
        podiumPercentage: podiumPct,
        currentWinStreak,
        bestWinStreak,
        currentPodiumStreak,
        bestPodiumStreak,
        currentMonthRank: currRankItem?.rank || 'N/A',
        currentMonthAverage: currRankItem?.average_score || 0,
        currentMonthMatches: currRankItem?.total_matches || 0,
        currentMonthWins: currRankItem?.wins_1st || 0,
        currentMonthQualified: currRankItem?.is_qualified || false
      },
      recentMatches,
      performanceBySize,
      monthlyPerformance
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Head-to-Head Comparison
router.get('/head-to-head', optionalAuthenticateToken, async (req, res) => {
  try {
    const player1Id = Number(req.query.player1Id);
    const player2Id = Number(req.query.player2Id);

    if (!player1Id || !player2Id) {
      return res.status(400).json({ error: 'Both player1Id and player2Id are required' });
    }

    if (player1Id === player2Id) {
      return res.status(400).json({ error: 'Please select two different players' });
    }

    const players = await query<any>('SELECT * FROM players WHERE id IN (?, ?)', [player1Id, player2Id]);
    const p1 = players.find((p) => p.id === player1Id);
    const p2 = players.find((p) => p.id === player2Id);

    if (!p1 || !p2) {
      return res.status(404).json({ error: 'One or both players not found' });
    }

    // Find matches where BOTH player1 and player2 played together
    const sharedMatchesSql = `
      SELECT m.id, m.friendly_id, m.match_date, m.match_time, m.player_count,
        mr1.position as p1_pos, mr1.points_awarded as p1_pts,
        mr2.position as p2_pos, mr2.points_awarded as p2_pts
      FROM matches m
      JOIN match_results mr1 ON m.id = mr1.match_id AND mr1.player_id = ?
      JOIN match_results mr2 ON m.id = mr2.match_id AND mr2.player_id = ?
      WHERE m.is_deleted = 0
      ORDER BY m.match_date DESC, m.match_time DESC, m.id DESC
    `;

    const rawEncounters = await query<any>(sharedMatchesSql, [player1Id, player2Id]);
    const encounters = rawEncounters.map((e) => ({
      ...e,
      match_date: e.match_date && String(e.match_date).includes('T') ? String(e.match_date).split('T')[0] : String(e.match_date || '')
    }));

    let matchesTogether = encounters.length;
    let p1AheadCount = 0;
    let p2AheadCount = 0;
    let p1WinsCount = 0;
    let p2WinsCount = 0;
    let p1TotalPts = 0;
    let p2TotalPts = 0;
    let p1TotalPos = 0;
    let p2TotalPos = 0;

    encounters.forEach((e) => {
      const pos1 = Number(e.p1_pos);
      const pos2 = Number(e.p2_pos);
      const pts1 = Number(e.p1_pts);
      const pts2 = Number(e.p2_pts);

      p1TotalPts += pts1;
      p2TotalPts += pts2;
      p1TotalPos += pos1;
      p2TotalPos += pos2;

      if (pos1 < pos2) p1AheadCount++;
      else if (pos2 < pos1) p2AheadCount++;

      if (pos1 === 1) p1WinsCount++;
      if (pos2 === 1) p2WinsCount++;
    });

    return res.json({
      player1: p1,
      player2: p2,
      headToHead: {
        matchesTogether,
        player1AheadCount: p1AheadCount,
        player2AheadCount: p2AheadCount,
        player1WinsCount: p1WinsCount,
        player2WinsCount: p2WinsCount,
        player1AvgScore: matchesTogether > 0 ? Number((p1TotalPts / matchesTogether).toFixed(2)) : 0,
        player2AvgScore: matchesTogether > 0 ? Number((p2TotalPts / matchesTogether).toFixed(2)) : 0,
        player1AvgPosition: matchesTogether > 0 ? Number((p1TotalPos / matchesTogether).toFixed(2)) : 0,
        player2AvgPosition: matchesTogether > 0 ? Number((p2TotalPos / matchesTogether).toFixed(2)) : 0,
        player1WinPct: matchesTogether > 0 ? Number(((p1WinsCount / matchesTogether) * 100).toFixed(1)) : 0,
        player2WinPct: matchesTogether > 0 ? Number(((p2WinsCount / matchesTogether) * 100).toFixed(1)) : 0,
        latestEncounters: encounters.slice(0, 15)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Multi-Player Comparison (up to 4 players)
router.get('/multi-player', optionalAuthenticateToken, async (req, res) => {
  try {
    const rawIds = req.query.playerIds as string;
    if (!rawIds) return res.status(400).json({ error: 'playerIds comma-separated parameter is required' });

    const pIds = rawIds.split(',').map((id) => Number(id.trim())).filter((id) => !isNaN(id) && id > 0);
    if (pIds.length === 0) return res.status(400).json({ error: 'At least one valid player ID required' });

    const placeholders = pIds.map(() => '?').join(',');
    const players = await query<any>(`SELECT * FROM players WHERE id IN (${placeholders})`, pIds);

    const statsSql = `
      SELECT
        mr.player_id,
        COUNT(mr.id) as total_matches,
        COALESCE(SUM(mr.points_awarded), 0) as total_points,
        ROUND(AVG(mr.points_awarded), 2) as average_score,
        ROUND(AVG(mr.position), 2) as average_position,
        SUM(CASE WHEN mr.position = 1 THEN 1 ELSE 0 END) as wins_1st,
        SUM(CASE WHEN mr.position <= 3 THEN 1 ELSE 0 END) as podium_finishes
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE mr.player_id IN (${placeholders}) AND m.is_deleted = 0
      GROUP BY mr.player_id
    `;
    const statsRows = await query<any>(statsSql, pIds);

    const comparison = players.map((p) => {
      const st = statsRows.find((s) => s.player_id === p.id) || {};
      const mCount = Number(st.total_matches) || 0;
      const pts = Number(st.total_points) || 0;
      const wins = Number(st.wins_1st) || 0;
      const podium = Number(st.podium_finishes) || 0;

      return {
        player: p,
        total_matches: mCount,
        total_points: Number(pts.toFixed(2)),
        average_score: mCount > 0 ? Number((pts / mCount).toFixed(2)) : 0,
        average_position: mCount > 0 ? Number(Number(st.average_position).toFixed(2)) : 0,
        wins,
        win_pct: mCount > 0 ? Number(((wins / mCount) * 100).toFixed(1)) : 0,
        podium_finishes: podium,
        podium_pct: mCount > 0 ? Number(((podium / mCount) * 100).toFixed(1)) : 0
      };
    });

    return res.json({ comparison });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Monthly Awards Endpoint
router.get('/monthly-awards', optionalAuthenticateToken, async (req, res) => {
  try {
    const monthStr = (req.query.month as string) || new Date().toISOString().split('T')[0].substring(0, 7);
    const minM = await getMinMatchesThreshold();

    const leaderboard = await calculateLeaderboard({ month: monthStr });

    if (leaderboard.length === 0) {
      return res.json({ month: monthStr, awards: null, message: 'No matches recorded for this month.' });
    }

    // 1. Champion: Highest qualifying average
    const champions = leaderboard.filter((p) => p.is_champion);

    // 2. Most Wins
    const sortedByWins = [...leaderboard].sort((a, b) => b.wins_1st - a.wins_1st || b.total_matches - a.total_matches);
    const mostWinsWinner = sortedByWins[0];

    // 3. Best Win Rate (among qualified players)
    const qualifiedByWinRate = leaderboard.filter((p) => p.is_qualified).sort((a, b) => b.win_pct - a.win_pct);
    const bestWinRateWinner = qualifiedByWinRate[0] || sortedByWins[0];

    // 4. Most Active
    const sortedByActivity = [...leaderboard].sort((a, b) => b.total_matches - a.total_matches);
    const mostActiveWinner = sortedByActivity[0];

    // 5. Most Improved (vs previous month)
    const prevDate = new Date(`${monthStr}-01`);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthStr = prevDate.toISOString().split('T')[0].substring(0, 7);

    const prevLeaderboard = await calculateLeaderboard({ month: prevMonthStr });

    let mostImprovedWinner = null;
    let maxImprovement = -999;

    leaderboard.forEach((curr) => {
      const prev = prevLeaderboard.find((p) => p.player_id === curr.player_id);
      if (prev && curr.total_matches >= Math.min(4, minM) && prev.total_matches >= Math.min(4, minM)) {
        const diff = curr.average_score - prev.average_score;
        if (diff > maxImprovement && diff > 0) {
          maxImprovement = diff;
          mostImprovedWinner = {
            player: curr,
            prevAverage: prev.average_score,
            currAverage: curr.average_score,
            improvement: Number(diff.toFixed(2))
          };
        }
      }
    });

    // 6. Most Consistent (Lowest variance/stddev among qualified players)
    const qualifiedPlayers = leaderboard.filter((p) => p.is_qualified);
    let mostConsistentWinner = null;
    let minStdDev = 999999;

    for (const p of qualifiedPlayers) {
      const matchPtsSql = `
        SELECT mr.points_awarded
        FROM match_results mr
        JOIN matches m ON mr.match_id = m.id
        WHERE mr.player_id = ? AND m.match_date LIKE ? AND m.is_deleted = 0
      `;
      const ptsRows = await query<{ points_awarded: number }>(matchPtsSql, [p.player_id, `${monthStr}%`]);
      if (ptsRows.length >= minM) {
        const pts = ptsRows.map((r) => Number(r.points_awarded));
        const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
        const variance = pts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pts.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev < minStdDev) {
          minStdDev = stdDev;
          mostConsistentWinner = {
            player: p,
            stdDev: Number(stdDev.toFixed(2))
          };
        }
      }
    }

    return res.json({
      month: monthStr,
      awards: {
        champions,
        mostWins: mostWinsWinner,
        bestWinRate: bestWinRateWinner,
        mostActive: mostActiveWinner,
        mostImproved: mostImprovedWinner,
        mostConsistent: mostConsistentWinner
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Monthly History & Champions Archive
router.get('/monthly-history', optionalAuthenticateToken, async (req, res) => {
  try {
    const monthsSql = `
      SELECT DISTINCT SUBSTRING(match_date, 1, 7) as month
      FROM matches
      WHERE is_deleted = 0
      ORDER BY month DESC
    `;
    const monthsRows = await query<{ month: string }>(monthsSql);

    const history = [];

    for (const r of monthsRows) {
      const monthStr = r.month;
      const leaderboard = await calculateLeaderboard({ month: monthStr });
      const champions = leaderboard.filter((p) => p.is_champion);
      const totalMatchesRes = await query<{ count: number }>(
        'SELECT COUNT(*) as count FROM matches WHERE match_date LIKE ? AND is_deleted = 0',
        [`${monthStr}%`]
      );

      history.push({
        month: monthStr,
        champions,
        totalMatches: totalMatchesRes[0]?.count || 0,
        topLeaderboard: leaderboard.slice(0, 3)
      });
    }

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Charts & Visualizations Data
router.get('/charts', optionalAuthenticateToken, async (req, res) => {
  try {
    const { playerId } = req.query;

    // Match volume chart (last 12 months)
    const volumeSql = `
      SELECT SUBSTRING(match_date, 1, 7) as month, COUNT(*) as match_count
      FROM matches
      WHERE is_deleted = 0
      GROUP BY SUBSTRING(match_date, 1, 7)
      ORDER BY month ASC
      LIMIT 12
    `;
    const matchVolume = await query<any>(volumeSql);

    // Overall or single player position distribution
    let posDistSql = `
      SELECT position, COUNT(*) as count
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE m.is_deleted = 0
    `;
    const posDistParams: any[] = [];

    if (playerId && !isNaN(Number(playerId))) {
      posDistSql += ' AND mr.player_id = ?';
      posDistParams.push(Number(playerId));
    }
    posDistSql += ' GROUP BY position ORDER BY position ASC';

    const positionDistribution = await query<any>(posDistSql, posDistParams);

    // Rolling average score trend (last 30 matches)
    let trendSql = `
      SELECT m.match_date, m.friendly_id, mr.points_awarded, mr.position
      FROM match_results mr
      JOIN matches m ON mr.match_id = m.id
      WHERE m.is_deleted = 0
    `;
    const trendParams: any[] = [];
    if (playerId && !isNaN(Number(playerId))) {
      trendSql += ' AND mr.player_id = ?';
      trendParams.push(Number(playerId));
    }
    trendSql += ' ORDER BY m.match_date ASC, m.match_time ASC, m.id ASC LIMIT 50';

    const rawTrend = await query<any>(trendSql, trendParams);

    // Calculate rolling 5-match average
    const rollingTrend = rawTrend.map((row, idx) => {
      const start = Math.max(0, idx - 4);
      const slice = rawTrend.slice(start, idx + 1);
      const avgPts = slice.reduce((acc, curr) => acc + Number(curr.points_awarded), 0) / slice.length;
      return {
        match_date: row.match_date && String(row.match_date).includes('T') ? String(row.match_date).split('T')[0] : String(row.match_date || ''),
        friendly_id: row.friendly_id,
        points: Number(row.points_awarded),
        position: row.position,
        rolling_avg: Number(avgPts.toFixed(2))
      };
    });

    return res.json({
      matchVolume,
      positionDistribution,
      rollingTrend
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CSV Report Export
router.get('/export', optionalAuthenticateToken, async (req, res) => {
  try {
    const { type, month, year } = req.query;

    if (type === 'leaderboard') {
      const leaderboard = await calculateLeaderboard({
        month: month && typeof month === 'string' ? month : undefined,
        year: year && typeof year === 'string' ? year : undefined
      });

      let csv = 'Rank,Player Name,Matches Played,1st Places (Wins),2nd Places,3rd Places,4th Places,Total Points,Average Score,Average Position,Win %,Podium %,Qualification Status\n';
      leaderboard.forEach((p) => {
        const rStr = p.is_qualified && p.rank > 0 ? p.rank : 'Unqualified';
        csv += `${rStr},"${p.full_name}",${p.total_matches},${p.wins_1st},${p.pos_2nd},${p.pos_3rd},${p.pos_4th},${p.total_points},${p.average_score},${p.average_position},${p.win_pct}%,${p.podium_pct}%,${p.is_qualified ? 'Qualified' : 'Not Qualified'}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=Ludo_Leaderboard_${month || year || 'AllTime'}.csv`);
      return res.send(csv);
    }

    if (type === 'matches') {
      const sql = `
        SELECT m.friendly_id, m.match_date, m.match_time, m.player_count, m.notes,
               p.full_name, mr.position, mr.points_awarded
        FROM matches m
        JOIN match_results mr ON m.id = mr.match_id
        JOIN players p ON mr.player_id = p.id
        WHERE m.is_deleted = 0
        ORDER BY m.match_date DESC, m.match_time DESC, mr.position ASC
      `;
      const rows = await query<any>(sql);

      let csv = 'Match ID,Date,Time,Player Count,Player Name,Rank,Points Awarded,Notes\n';
      rows.forEach((r) => {
        const dStr = r.match_date && String(r.match_date).includes('T') ? String(r.match_date).split('T')[0] : String(r.match_date || '');
        csv += `"${r.friendly_id}",${dStr},${r.match_time},${r.player_count},"${r.full_name}",${r.position},${r.points_awarded},"${r.notes || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=Ludo_Match_History.csv`);
      return res.send(csv);
    }

    return res.status(400).json({ error: 'Invalid export type. Supported: leaderboard, matches' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
