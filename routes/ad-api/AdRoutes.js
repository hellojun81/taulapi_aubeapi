import express from 'express';
import {stopMetaAd,startMetaAd,getMetaAdStatus} from './metaAdControl.js';
import { fetchMetaAds } from '../../services/ad-api/meta.js';
import { fetchNaverAds } from '../../services/ad-api/naverSearch.js';
// import { saveAdPerformanceList } from '../../services/ad-api/collectAll.js';
import axios from 'axios';

const router = express.Router();

// 광고 중지
router.post('/meta-ad/stop', stopMetaAd);
// 광고 시작
router.post('/meta-ad/start', startMetaAd);
// 광고 상태 확인
router.get('/meta-ad/status', getMetaAdStatus);

router.post('/ad-register/insert', async (req, res) => {
  const { platform } = req.body;
  const { sinceDate } = req.body;
  const { untilDate } = req.body;
  let result; // let으로 선언해줘야 case 안에서 할당 가능
 console.log('platform',platform)
  switch (platform) {
    case 'meta':
      result = await fetchMetaAds('meta',sinceDate,untilDate);
      break;
    case 'instagram':
      result = await fetchMetaAds('instagram',sinceDate,untilDate);
      break;
    case 'google':
      result = await fetchMetaAds(sinceDate,untilDate);
      break;
    case 'naver':
      console.log('naver 광고성과 저장');
      result = await fetchNaverAds(sinceDate,untilDate);
      break;
    default:
      console.log('❓ 알 수 없는 플랫폼:', platform);
      return res.status(400).json({ success: false, error: '지원하지 않는 플랫폼' });
  }
 console.log('start /ad-register/insert',result)
res.json(result)
  
// res.json(result)
// if (result && result.length > 0) {
//   const { inserted, skipped, total, skippedIds } = await saveAdPerformanceList(result);
//   return res.json({
//     success: true,
//     message: '광고 데이터 저장 완료',
//     total,
//     inserted,
//     skipped,
//     skippedIds, // 필요 없으면 제거해도 됩니다
//   });
// } else {
//   return res.status(400).json({
//     success: false,
//     error: '광고 데이터가 없습니다.',
//   });
// }

});

export default router;
