import { PrismaClient } from '@prisma/client';
import { AdPerformance as AdPerformanceType } from '@shared-types/adInsight';

const prisma = new PrismaClient();

export async function saveAdsData(data: AdPerformanceType[]) {
  for (const ad of data) {
    await prisma.AdPerformance.upsert({
      where: {
        platform_campaignId_date: {
          platform: ad.platform!,
          campaignId: ad.campaignId!,
          date: ad.date,
        },
      },
      create: {
        platform: ad.platform!,
        campaignId: ad.campaignId!,
        campaignName: ad.campaignName ?? '',
        impressions: ad.impressions ?? 0,
        clicks: ad.clicks ?? 0,
        spend: ad.spend ?? 0,
        date: ad.date,
        cpc: ad.cpc ?? 0,
        ctr: ad.ctr ?? 0,
        conversions: ad.conversions ?? 0,
      },
      update: {
        impressions: ad.impressions ?? 0,
        clicks: ad.clicks ?? 0,
        spend: ad.spend ?? 0,
        campaignName: ad.campaignName ?? '',
      },
    });    
  }
}
