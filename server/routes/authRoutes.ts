import { Router } from 'express';
import { query, execute } from '../db';
import { hashPassword, comparePassword, generateToken, authenticateToken, logAudit, AuthenticatedRequest } from '../auth';

const router = Router();

// Check if initial admin exists
router.get('/setup-status', async (req, res) => {
  try {
    const users = await query<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const userCount = users[0]?.count || 0;
    return res.json({ needsFirstAdmin: userCount === 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Setup first admin if database has 0 users
router.post('/setup-admin', async (req, res) => {
  try {
    const users = await query<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if ((users[0]?.count || 0) > 0) {
      return res.status(400).json({ error: 'System already has users. Use regular user management.' });
    }

    const { name, username, email, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await hashPassword(password);
    const result = await execute(
      `INSERT INTO users (name, username, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, username.trim(), email?.trim() || null, passwordHash]
    );

    const newUser = {
      id: result.insertId,
      name,
      username: username.trim(),
      email: email?.trim() || null,
      role: 'admin' as const,
      is_active: 1
    };

    const token = generateToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAudit(req as AuthenticatedRequest, 'SETUP_FIRST_ADMIN', 'users', result.insertId, { username });

    return res.json({
      message: 'Administrator created successfully',
      user: newUser,
      token
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = await query<any>('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const authUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };

    const token = generateToken(authUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAudit({ user: authUser } as AuthenticatedRequest, 'LOGIN', 'users', user.id);

    return res.json({
      message: 'Logged in successfully',
      user: authUser,
      token
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

// Current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const users = await query<any>('SELECT id, name, username, email, role, is_active, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: users[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List all system users (Admin required)
router.get('/users', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }
    const users = await query<any>(
      'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Register or create new operator or admin user (Admin required)
const handleCreateUser = async (req: AuthenticatedRequest, res: any) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required to create users' });
    }
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const userRole = role && ['admin', 'operator', 'viewer'].includes(role) ? role : 'operator';

    const existing = await query<any>('SELECT id FROM users WHERE username = ?', [trimmedUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Username "${trimmedUsername}" is already taken` });
    }

    const passwordHash = await hashPassword(password);
    const result = await execute(
      `INSERT INTO users (name, username, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name.trim(), trimmedUsername, email?.trim() || null, passwordHash, userRole]
    );

    await logAudit(req, 'CREATE_USER', 'users', result.insertId, { username: trimmedUsername, role: userRole });

    const newUser = {
      id: result.insertId,
      name: name.trim(),
      username: trimmedUsername,
      email: email?.trim() || null,
      role: userRole,
      is_active: 1
    };

    return res.json({
      message: `User ${trimmedUsername} created successfully`,
      user: newUser,
      userId: result.insertId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

router.post('/users', authenticateToken, handleCreateUser);
router.post('/register', authenticateToken, handleCreateUser);

// Update system user details / role / status (Admin required)
router.put('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const userId = Number(req.params.id);
    const { name, role, is_active, password } = req.body;

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

    const updatedName = name ? name.trim() : user.name;
    const updatedRole = role && ['admin', 'operator', 'viewer'].includes(role) ? role : user.role;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : user.is_active;

    if (password && password.trim()) {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }
      const newHash = await hashPassword(password);
      await execute(
        'UPDATE users SET name = ?, role = ?, is_active = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updatedName, updatedRole, updatedActive, newHash, userId]
      );
    } else {
      await execute(
        'UPDATE users SET name = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updatedName, updatedRole, updatedActive, userId]
      );
    }

    await logAudit(req, 'UPDATE_USER', 'users', userId, { role: updatedRole, is_active: updatedActive });

    return res.json({ message: 'User updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete user (Admin required)
router.delete('/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const userId = Number(req.params.id);
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in account.' });
    }

    const existingUsers = await query<any>('SELECT * FROM users WHERE id = ?', [userId]);
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await execute('DELETE FROM users WHERE id = ?', [userId]);
    await logAudit(req, 'DELETE_USER', 'users', userId, { username: existingUsers[0].username });

    return res.json({ message: 'User removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
