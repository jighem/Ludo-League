import { Router } from 'express';
import { query, execute } from '../db';
import { hashPassword, authenticateToken, requireRole, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await query<any>(
      'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create new user
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, username, email, password, role } = req.body;
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

    const passwordHash = await hashPassword(password);
    const result = await execute(
      `INSERT INTO users (name, username, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, username.trim(), email?.trim() || null, passwordHash, role]
    );

    await logAudit(req, 'CREATE_USER', 'users', result.insertId, { username, role });

    return res.json({
      message: 'User created successfully',
      userId: result.insertId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update user role, name, active status
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email, role, is_active } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    if (!['admin', 'operator', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await execute(
      `UPDATE users SET name = ?, email = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, email || null, role, is_active ? 1 : 0, userId]
    );

    await logAudit(req, 'UPDATE_USER', 'users', userId, { role, is_active });

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
