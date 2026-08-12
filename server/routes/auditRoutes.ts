import { Router } from 'express';
import { query } from '../db';
import { authenticateToken, requireRole } from '../auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const countRes = await query<{ total: number }>('SELECT COUNT(*) as total FROM audit_logs');
    const total = countRes[0]?.total || 0;

    const sql = `
      SELECT * FROM audit_logs
      ORDER BY id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const logs = await query<any>(sql);

    return res.json({
      logs,
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

export default router;
