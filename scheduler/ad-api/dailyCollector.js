import cron from 'node-cron';
import dayjs from 'dayjs';

// import { saveAdPerformanceList } from '../../services/ad-api/collectAll.js';
import { fetchMetaAds } from '../../services/ad-api/meta.js';
import { fetchNaverAds } from '../../services/ad-api/naverSearch.js';
// import { getGoogleAdDataForDate } from '../services/ads/google.js';
// import { getInstagramAdDataForDate } from '../services/ads/instagram.js';
// import { getTiktokAdDataForDate } from '../services/ads/tiktok.js';

const date = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
const PLATFORMS = [
  { name: 'meta', fetcher: (date) => fetchMetaAds('meta', date, date) },
  { name: 'naver',  fetcher: (date) => fetchNaverAds('naver', date, date) },
  { name: 'instagram', fetcher: (date) => fetchMetaAds('instagram', date,date) },
];


// cron.schedule('54 13 * * *', async () => {

cron.schedule('05 05 * * *', async () => {
  const date = dayjs().subtract(1, 'day').format('YYYY-MM-DD');


await Promise.all(
  PLATFORMS.map(async ({ name, fetcher }) => {
    try {
      const result = await fetcher(date);
      console.log({
        [`⏰광고성과 수집 api시작: ${date} PLATFORMS : ${name}`]: result
      });
      // 👇 반드시 배열인 값만 전달
      const dataList = result.insertedItems ?? result.data ?? [];
      if (!Array.isArray(dataList)) {
        throw new Error(`[${name}] fetcher did not return a valid array`);
      }
      console.log({
        [`⏰광고성과 수집 종료:`]: result
      });
    } catch (err) {
      console.error(`❌ [${name}] error:`, err);
    }
  })
);
});
