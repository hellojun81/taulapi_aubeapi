// google.ts
import axios from 'axios';
import { AdPerformance } from "@shared-types/adInsight";

const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
const CUSTOMER_ID = process.env.GOOGLE_CUSTOMER_ID;

export async function fetchGoogleAds(): Promise<AdPerformance[]> {
  const url = `https://googleads.googleapis.com/v14/customers/${CUSTOMER_ID}/googleAds:searchStream`;

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      segments.date
    FROM campaign
    WHERE segments.date DURING YESTERDAY
  `;

  const response = await axios.post(
    url,
    { query },
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN!,
        'login-customer-id': process.env.GOOGLE_MANAGER_ID!,
        'Content-Type': 'application/json',
      },
    }
  );

  // 응답은 스트리밍 형태로 여러 청크로 나올 수 있음
  const ads: AdPerformance[] = [];
  for (const chunk of response.data) {
    for (const row of chunk.results) {
      ads.push({
        platform: 'google',
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        impressions: parseInt(row.metrics.impressions),
        clicks: parseInt(row.metrics.clicks),
        spend: parseFloat(row.metrics.cost_micros) / 1_000_000,
        date: row.segments.date,
        cpc: 0,
        ctr: 0,
        conversions: 0,
      });
    }
  }

  return ads;
}