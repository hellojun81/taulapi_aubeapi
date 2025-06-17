import express from 'express';
import pool from '../../lib/ad-api/index.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { startDate, endDate, platform } = req.query;
  // console.log({startDate:startDate,endDate:endDate})

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM AdPerformance
       WHERE date BETWEEN ? AND ?
       ${platform ? 'AND platform = ?' : ''}
       ORDER BY date ASC`,
      platform ? [startDate, endDate, platform] : [startDate, endDate]
    );



const results = rows.map(row => ({
  ...row,
  platform: row.platform?.toString(),
  campaignId: row.campaignId?.toString(),
  campaignName: row.campaignName?.toString(),
  adId: row.adId?.toString(),
  ad_name: row.ad_name?.toString(),
}));
res.json(results);

  } catch (err) {
    console.error('❌ DB fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
