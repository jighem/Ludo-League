import { Router } from 'express';
import { query, execute } from '../db';
import { hashPassword, authenticateToken, requireRole, logAudit, AuthenticatedRequest, parseAllowedLeagues } from '../auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await query<any>(
      'SELECT id, name, username, email, role, allowed_leagues, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    users.forEach((u: any) => {
      u.allowed_leagues = parseAllowedLeagues(u.allowed_leagues);
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create new user
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, username, email, password, role, allowed_leagues } = req.body;
    if (!name || !username || !password || !role) {
      return res.status(400).json({ error: 'Name, username, password, and role are required' });
    }

    if (!['admin', 'operator', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, operator, or viewer' });
    }

    const existing = await query<any>('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    let formattedAllowedLeagues: string | null = null;
    if (role === 'admin') {
      formattedAllowedLeagues = null;
    } else if (allowed_leagues !== undefined && allowed_leagues !== null) {
      if (Array.isArray(allowed_leagues)) {
        formattedAllowedLeagues = JSON.stringify(allowed_leagues.map(Number).filter((n) => !isNaN(n)));
      } else if (typeof allowed_leagues === 'string' && allowed_leagues.trim()) {
        try {
          const parsed = JSON.parse(allowed_leagues);
          formattedAllowedLeagues = Array.isArray(parsed) ? JSON.stringify(parsed.map(Number)) : null;
        } catch {
          formattedAllowedLeagues = JSON.stringify(allowed_leagues.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n)));
        }
      }
    }

    const passwordHash = await hashPassword(password);
    const result = await execute(
      `INSERT INTO users (name, username, email, password_hash, role, allowed_leagues, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name.trim(), username.trim().toLowerCase(), email?.trim() || null, passwordHash, role, formattedAllowedLeagues]
    );

    await logAudit(req, 'CREATE_USER', 'users', result.insertId, {
      username: username.trim(),
      role,
      allowed_leagues: formattedAllowedLeagues
    });

    return res.json({
      message: 'User created successfully',
      userId: result.insertId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update user role, name, active status, allowed leagues
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, role, is_active, allowed_leagues, password } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    if (!['admin', 'operator', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUsers = await query<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = existingUsers[0];

    // Prevent deactivating or demoting the last active admin
    if (user.role === 'admin' && (is_active === 0 || is_active === false || (role && role !== 'admin'))) {
      const activeAdmins = await query<any>('SELECT id FROM users WHERE role = "admin" AND is_active = 1');
      if (activeAdmins.length <= 1 && activeAdmins[0]?.id === userId) {
        return res.status(400).json({ error: 'Cannot de-escalate or deactivate the only active system administrator.' });
      }
    }

    let updatedAllowedLeagues: string | null = user.allowed_leagues;
    if (role === 'admin') {
      updatedAllowedLeagues = null;
    } else if (allowed_leagues !== undefined) {
      if (allowed_leagues === null) {
        updatedAllowedLeagues = null;
      } else if (Array.isArray(allowed_leagues)) {
        updatedAllowedLeagues = JSON.stringify(allowed_leagues.map(Number).filter((n) => !isNaN(n)));
      } else if (typeof allowed_leagues === 'string') {
        try {
          const parsed = JSON.parse(allowed_leagues);
          updatedAllowedLeagues = Array.isArray(parsed) ? JSON.stringify(parsed.map(Number)) : null;
        } catch {
          updatedAllowedLeagues = JSON.stringify(allowed_leagues.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n)));
        }
      }
    }

    if (password && password.trim()) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      const newHash = await hashPassword(password);
      await execute(
        `UPDATE users SET name = ?, email = ?, role = ?, allowed_leagues = ?, is_active = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name.trim(), email?.trim() || null, role, updatedAllowedLeagues, is_active ? 1 : 0, newHash, userId]
      );
    } else {
      await execute(
        `UPDATE users SET name = ?, email = ?, role = ?, allowed_leagues = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name.trim(), email?.trim() || null, role, updatedAllowedLeagues, is_active ? 1 : 0, userId]
      );
    }

    await logAudit(req, 'UPDATE_USER', 'users', userId, {
      role,
      is_active,
      allowed_leagues: updatedAllowedLeagues
    });

    return res.json({ message: 'User updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset user password
router.post('/:id/reset-password', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const passwordHash = await hashPassword(newPassword);
    await execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, userId]);

    await logAudit(req, 'RESET_PASSWORD', 'users', userId);

    return res.json({ message: 'Password reset successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
