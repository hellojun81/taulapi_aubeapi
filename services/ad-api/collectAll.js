// import { insertAdPerformance, recordExists } from '../../lib/ad-api/adPerformanceRepo.js';

// export async function saveAdPerformanceList(dataList) {
//   let inserted = 0;
//   let skipped = 0;
//   const skippedIds = [];
//  console.log('[DEBUG] typeof dataList:', typeof dataList);
//   console.log('[DEBUG] isArray:', Array.isArray(dataList));
//   console.log('[DEBUG] value:', dataList);
//   for (const record of dataList) {
//     const exists = await recordExists(record);
//     if (!exists) {
//       await insertAdPerformance(record);
//       inserted++;
//     } else {
//       skipped++;
//       skippedIds.push(record.adId); // 중복된 adId 저장
//       console.log(`🚫 중복 데이터 스킵: ${record.platform}, ${record.date}, ${record.adId}`);
//     }
//   }

//   return {
//     inserted,
//     skipped,
//     total: dataList.length,
//     skippedIds,
//   };
// }
