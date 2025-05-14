import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { calculateDerivedMetrics } from '../../lib/ad-api/calculateDerivedMetrics.js';
import { insertAdPerformance, recordExists } from '../../lib/ad-api/adPerformanceRepo.js';

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

export async function fetchMetaAds(platform, sinceDate, untilDate) {
  let inserted = 0;
  let skipped = 0;
  const skippedIds = [];
  const AD_ACCOUNT_ID =
    platform === 'meta' ? process.env.META_AD_ACCOUNT_ID : process.env.INSTA_AD_ACCOUNT_ID;

  const insightsUrl = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/insights`;
  const insightsParams = {
    access_token: ACCESS_TOKEN,
    level: 'ad',
    fields: [
      'ad_id',
      'ad_name',
      'campaign_id',
      'campaign_name',
      'objective',
      'impressions',
      'reach',
      'frequency',
      'clicks',
      'unique_clicks',
      'spend',
      'cpc',
      'cpm',
      'actions',
      'action_values',
      'date_start',
      'adset_id',
    ].join(','),
    time_range: { since: sinceDate, until: untilDate },
    time_increment: 1,
    limit: 500,
  };

  const { data } = await axios.get(insightsUrl, { params: insightsParams });
  const adInsights = data.data;
  // console.log('adInsights',adInsights)
  for (const item of adInsights) {
    let image_url = null;
    let creativeId = null;

    // ① 광고 상세에서 creative.id 조회
    try {
      const adDetailRes = await axios.get(`https://graph.facebook.com/v19.0/${item.ad_id}`, {
        params: {
          access_token: ACCESS_TOKEN,
          fields: 'creative',
        },
      });
      creativeId = adDetailRes.data?.creative?.id;
    } catch (err) {
      console.warn(`⚠️ creative ID 조회 실패: ad_id=${item.ad_id}`, err.message);
    }
    // console.log('creativeId',creativeId)
    // ② creative.id로 이미지 URL 조회
    if (creativeId) {
      try {
        const creativeRes = await axios.get(`https://graph.facebook.com/v19.0/${creativeId}`, {
          params: {
            access_token: ACCESS_TOKEN,
            fields: 'object_story_spec{link_data{image_url}},thumbnail_url',
          },
        });
        image_url =
          creativeRes.data?.object_story_spec?.link_data?.image_url ||
          creativeRes.data?.thumbnail_url ||
          null;
      } catch (err) {
        console.warn(`⚠️ 이미지 URL 조회 실패: creativeId=${creativeId}`, err.message);
      }
    }

    // ③ link_click 추출
    const linkClicks = parseInt(
      (item.actions || []).find((a) => a.action_type === 'link_click')?.value || '0'
    );
  //  console.log('image_url',image_url)
    // ④ 파생 지표 계산
    const processed = calculateDerivedMetrics({
      platform,
      date: item.date_start,
      campaignId: item.campaign_id,
      campaignName: item.campaign_name,
      campaignType: item.objective,
      adGroupId: item.adset_id,
      adId: item.ad_id,
      ad_name: item.ad_name,
      impressions: parseInt(item.impressions || '0'),
      reach: parseInt(item.reach || '0'),
      frequency: parseFloat(item.frequency || '0'),
      clicks: parseInt(item.clicks || '0'),
      linkclicks: linkClicks,
      spend: parseFloat(item.spend || '0'),
      cpc: parseFloat(item.cpc || '0'),
      ctr: parseFloat(item.ctr || '0'),
      conversions: 0,
      conversion_value: 0,
      conversionRate: 0,
      cost_per_conversion: 0,
      roas: 0,
      device: null,
      keyword: null,
      image_url, // 👈 이미지 URL 포함
    });

    // ⑤ DB 중복 체크 및 저장
 const exists = await recordExists(processed);
    if (!exists) {
      await insertAdPerformance(processed);
      inserted++;
      // console.log(`✅ 저장됨:${platform}, ${item.ad_id}`);
    } else {
      skipped++;
      skippedIds.push(item.ad_id);
      // console.log(`🚫 중복 스킵${platform}, ${item.ad_id}`);
    }
  }

  return {
    inserted,
    skipped,
    total: adInsights.length,
    skippedIds,
  };

}
