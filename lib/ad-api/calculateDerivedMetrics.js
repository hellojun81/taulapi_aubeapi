export function calculateDerivedMetrics(data) {
  const {
    platform,
    date,
    campaignId,
    campaignName,
    campaignType,
    adGroupId,
    adId,
    ad_name,
    keyword,
    impressions,
    reach,
    frequency,
    clicks,
    linkclicks,
    spend,
    cpc,
    ctr,
    conversions,
    cost_per_conversion,
    conversion_value,
    conversionRate,
    roas,
    device,
    image_url, // ✅ 새로 추가됨
  } = data;

  // 유효성 검사 및 보정
  const safeCtr = impressions && clicks ? (clicks / impressions) * 100 : ctr;
  const safeCpc = clicks ? spend / clicks : cpc;
  const safeCostPerConversion = conversions ? spend / conversions : cost_per_conversion;
  const safeConversionRate = impressions ? (conversions / impressions) * 100 : conversionRate;
  const safeRoas = spend ? (conversion_value || 0) / spend : roas;
// console.log({'data':data})
  return {
    platform,
    date,
    campaignId,
    campaignName,
    campaignType,
    adGroupId,
    adId,
    ad_name,
    keyword,
    impressions,
    reach,
    frequency,
    clicks,
    linkclicks,
    spend,
    cpc: safeCpc,
    ctr: safeCtr,
    conversions,
    cost_per_conversion: safeCostPerConversion,
    conversion_value,
    conversionRate: safeConversionRate,
    roas: safeRoas,
    device,
    image_url, // ✅ 포함하여 반환
  };
}
