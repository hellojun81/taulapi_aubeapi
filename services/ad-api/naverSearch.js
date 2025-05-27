// fetchNaverAds.js
import "dotenv/config";
import axios from "axios";
import crypto from "crypto";
import {
  insertAdPerformance,
  recordExists,
} from "../../lib/ad-api/adPerformanceRepo.js";
import { calculateDerivedMetrics } from "../../lib/ad-api/calculateDerivedMetrics.js";

const BASE_URL = "https://api.searchad.naver.com";
const API_KEY = process.env.NAVER_ACCESS_LICENSE;
const SECRET_KEY = process.env.NAVER_SECRET_KEY;
const CUSTOMER_ID = process.env.NAVER_CUSTOMER_ID;
// 배열이면 첫 번째 값, 아니면 그대로, 없으면 기본값 반환
const safeLabel = (value, fallback = "(unknown)") => {
  if (Array.isArray(value)) return value[0] ?? fallback;
  if (typeof value === "string") return value;
  return fallback;
};
function generateSignature(timestamp, method, uri, secretKey) {
  const message = `${timestamp}.${method}.${uri}`;
  const hmac = crypto.createHmac("sha256", Buffer.from(secretKey, "utf-8"));
  hmac.update(message);
  return hmac.digest("base64");
}

function getHeaders(method, uri) {
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, method, uri, SECRET_KEY);
  return {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Timestamp": timestamp,
    "X-API-KEY": API_KEY,
    "X-Customer": CUSTOMER_ID,
    "X-Signature": signature,
  };
}

function getDateRangeList(since, until) {
  const dates = [];
  const current = new Date(since);
  const end = new Date(until);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function fetchCampaigns() {
  const uri = "/ncc/campaigns";
  const method = "GET";
  const res = await axios.get(BASE_URL + uri, {
    headers: getHeaders(method, uri),
  });
  return res.data;
}

async function fetchAdGroupsByCampaign(campaignId) {
  const uri = "/ncc/adgroups";
  const method = "GET";
  const res = await axios.get(BASE_URL + uri, {
    headers: getHeaders(method, uri),
    params: { nccCampaignId: campaignId },
  });
  return res.data;
}

async function fetchKeywords(adGroupId) {
  const uri = "/ncc/keywords";
  const method = "GET";
  const res = await axios.get(BASE_URL + uri, {
    headers: getHeaders(method, uri),
    params: { nccAdgroupId: adGroupId },
  });
  return res.data;
}

async function fetchAds(adGroupId) {
  const uri = "/ncc/ads";
  const method = "GET";
  const res = await axios.get(BASE_URL + uri, {
    headers: getHeaders(method, uri),
    params: { nccAdgroupId: adGroupId },
  });
  // console.log('fetchAds',res.data)
  return res.data;
}

async function fetchStats(ids, dateRange) {
  const uri = "/stats";
  const method = "GET";
   console.log({'ids':ids,'dateRange':dateRange,'uri':uri,'method':method})
  try {
    const res = await axios.get(BASE_URL + uri, {
      headers: getHeaders(method, uri),
      params: {
        ids: ids.join(","),
        fields: JSON.stringify([
          "impCnt",
          "clkCnt",
          "cpc",
          "ctr",
          "ccnt",
          "salesAmt",
          "crto",
        ]),
        timeRange: JSON.stringify(dateRange),
      },
    });
    // console.log({ 'ids': ids });
//    if (ids.includes("nkw-a001-01-000006335890611")) {
//   console.log("newresult", res.data.data);
// }
    return res.data.data;
  } catch (err) {
    console.error(
      `❌ fetchStats error (${dateRange.since}):`,
      err.response?.data || err.message
    );
    return [];
  }
}

export async function fetchNaverAds(sinceDate, untilDate) {
  const campaigns = await fetchCampaigns();
  const dateList = getDateRangeList(sinceDate, untilDate);

  let inserted = 0;
  let skipped = 0;
  const skippedIds = [];

  for (const campaign of campaigns) {
    const campaignId = campaign.nccCampaignId;
    const campaignName = campaign.name;
    const isPlaceCampaign = campaign.campaignTp === "PLACE";

    const adGroups = await fetchAdGroupsByCampaign(campaignId);

    for (const adGroup of adGroups) {
      const adGroupId = adGroup.nccAdgroupId;
      const adName = adGroup.name;
      // console.log('isPlaceCampaign',campaign)
      const units = isPlaceCampaign
        ? await fetchAds(adGroupId)
        : await fetchKeywords(adGroupId);

      if (!Array.isArray(units) || units.length === 0) continue;

      const idMap = {};
      const unitIds = units.map((u) => {
        const id = isPlaceCampaign ? u.nccAdId : u.nccKeywordId;
        idMap[id] = isPlaceCampaign ? u.ad : u.keyword;
        return id;
      });

      for (const date of dateList) {
        // console.log({'unitIds':unitIds,'date':date})
        const stats = await fetchStats(unitIds, { since: date, until: date });
        // console.log("stats", stats);
        for (const s of stats) {
          const rawLabel = idMap[s.id]; // 배열 or 문자열 or undefined 가능
          const label = safeLabel(rawLabel); // ✅ 안전화

          // const label = idMap[s.id] || '(unknown)';
          const clicks = s.clkCnt;
          const spend = s.cpc * clicks;
          // if(label=='nad-a001-06-000000314459815'){
          //   console.log('stats',stats)
          // }
          //  console.log('stats',s)
          const record = calculateDerivedMetrics({
            platform: "naver",
            date,
            campaignId,
            campaignName,
            campaignType: campaign.campaignType,
            adGroupId: adName,
            adId: s.id,
            ad_name: label,
            keyword: label,
            impressions: s.impCnt,
            reach: undefined,
            frequency: undefined,
            clicks,
            linkclicks: clicks,
            spend,
            cpc: s.cpc,
            ctr: s.ctr,
            conversions: s.ccnt,
            cost_per_conversion: undefined,
            conversion_value: s.salesAmt,
            conversionRate: s.crto,
            roas: undefined,
            device: undefined,
            image_url: null,
          });
          //  console.table(record);
          if (s.id === "nad-a001-06-000000314459815") {
            console.table(record); // 콘솔 테이블 형태 출력 (단순 key-value 확인 시)
          }
          const exists = await recordExists(record);
          if (!exists) {
            await insertAdPerformance(record);
            inserted++;
            // console.log(`✅ 저장됨:naver ${s.id}`);
          } else {
            skipped++;
            skippedIds.push(`${s.id}_${date}`);
            //  console.log(`🚫 중복 스킵:naver ${s.id}`);
          }
        }
      }
    }
  }

  return {
    inserted,
    skipped,
    total: inserted + skipped,
    skippedIds,
  };
}
