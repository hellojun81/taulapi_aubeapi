// routes/smsTemplates.js
import express from 'express';
// import { executeQuery } from '../sql.js'; // 확장자 .js 꼭 붙이세요
import sql from "../../lib/crm/sql.js";
const router = express.Router();

// GET /api/sms-templates?use=Y
router.get('/', async (req, res) => {
  try {
    const use = (req.query.use === 'N') ? 'N' : 'Y';
    const rows = await sql.executeQuery(
      'SELECT id, title, body FROM sms_templates WHERE use_yn = ? ORDER BY title ASC',
      [use]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load templates' });
  }
});

export default router;
