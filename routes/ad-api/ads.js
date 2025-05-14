import express from 'express';
import { collectAllAds } from '../../services/ad-api/collectAll';
import { saveAdsData } from '../../lib/ad-api/saveAds';

const router = express.Router();

// 수집 + 저장 endpoint
router.post('/collect-and-save', async (req, res) => {
  try {
    const ads = await collectAllAds();
    await saveAdsData(ads);
    res.json({ success: true, count: ads.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '오류 발생' });
  }
});

// 저장된 데이터 조회 endpoint
router.get('/performance', async (req, res) => {
  const prisma = new (await import('@prisma/client')).PrismaClient();
  const data = await prisma.adPerformance.findMany({
    orderBy: { date: 'desc' },
    take: 100,
  });
  res.json(data);
});

export default router;
