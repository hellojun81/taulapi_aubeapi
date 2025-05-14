// // tiktok.ts
// import axios from 'axios';
import { AdPerformance } from "@shared-types/adInsight";

// const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
// const ADVERTISER_ID = process.env.TIKTOK_ADVERTISER_ID;

// export async function fetchTiktokAds(): Promise<AdPerformance[]> {
//   const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/`;

//   const response = await axios.post(
//     url,
//     {
//       advertiser_id: ADVERTISER_ID,
//       service_type: 'AUCTION',
//       report_type: 'BASIC',
//       dimensions: ['campaign_id', 'campaign_name', 'stat_time_day'],
//       metrics: ['spend', 'impressions', 'clicks'],
//       start_date: getYesterday(),
//       end_date: getYesterday(),
//       page_size: 1000,
//     },
//     {
//       headers: {
//         'Access-Token': ACCESS_TOKEN,
//         'Content-Type': 'application/json',
//       },
//     }
//   );

//   return response.data.data.list.map((item: any): AdPerformance => ({
//     platform: 'tiktok',
//     campaignId: item.campaign_id,
//     campaignName: item.campaign_name,
//     impressions: parseInt(item.impressions),
//     clicks: parseInt(item.clicks),
//     spend: parseFloat(item.spend),
//     date: item.stat_time_day,
//     cpc: 0,
//     ctr: 0,
//     conversions: 0
//   }));
// }

// function getYesterday() {
//   return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
// }