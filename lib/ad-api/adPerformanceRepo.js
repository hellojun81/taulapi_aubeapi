import pool from './index.js';
import { normalizeParams } from '../../util/ad-api/util.js';

function toNullable(value) {
  return value === undefined ? null : value;
}

/**
 * 광고 성과 데이터가 이미 존재하는지 확인
 * @returns {Promise<boolean>}
 */
export async function recordExists(record) {
  const {
    platform,
    date,
    campaignId,
    adId,
    ad_name,
    campaignName,
    campaignType,
    adGroupId,
    impressions,
    clicks,
    linkclicks,
    spend,
    ctr,
    reach,
    frequency,
    conversionRate,
    conversions,
    conversion_value,
    cost_per_conversion,
    cpc,
    device,
    keyword,
  } = record;

  const sql = `
    SELECT 1 FROM AdPerformance
    WHERE platform = ? AND date = ? AND campaignId = ? AND adId = ?
      AND ad_name = ? AND campaignName = ? AND campaignType <=> ? AND adGroupId <=> ?
  `;
    const params = normalizeParams([
    platform,
    date,
    campaignId,
    adId,
    removeWhitespace(ad_name),
    campaignName,
    campaignType,
    adGroupId,
  ]);
  const [rows] = await pool.execute(sql, params);
  return rows.length > 0;
} 

/**
 * 광고 성과 데이터 삽입
 * @param {Object} data 광고 성과 객체
 */
function roundTo1Decimal(value) {
  return value === undefined || value === null ? value : Math.round(value * 10) / 10;
}

function removeWhitespace(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, '') : value;
}

export async function insertAdPerformance(data) {
  const {
    platform,
    date,
    campaignId,
    adId,
    ad_name,
    campaignName,
    campaignType,
    adGroupId,
    impressions,
    clicks,
    linkclicks,
    spend,
    ctr,
    reach,
    frequency,
    conversionRate,
    conversions,
    conversion_value,
    cost_per_conversion,
    cpc,
    device,
    keyword,
    image_url, // ✅ 추가
  } = data;

  const query = `
    INSERT INTO AdPerformance (
      platform, date, campaignId, adId, ad_name, campaignName, campaignType,adGroupId,
      impressions, clicks, linkclicks, spend, ctr, reach, frequency,
      conversionRate, conversions, conversion_value, cost_per_conversion,
      cpc, device, keyword, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    platform,
    date,
    campaignId,
    adId,
    removeWhitespace(ad_name),
    campaignName,
    campaignType,
    adGroupId,
    impressions,
    clicks,
    linkclicks,
    spend,
    roundTo1Decimal(ctr),
    reach,
    roundTo1Decimal(frequency),
    roundTo1Decimal(conversionRate),
    conversions,
    roundTo1Decimal(conversion_value),
    roundTo1Decimal(cost_per_conversion),
    roundTo1Decimal(cpc),
    device,
    keyword,
    image_url,
  ].map(toNullable);

  await pool.execute(query, values);
}
