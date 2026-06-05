import cron from "node-cron";
import mysql from "mysql2/promise";
import filmmakersContoller from "../../controllers/crm/filmmakers.js";
import * as popbillBank from "../../services/popbill/popbillBank.js";
import dayjs from "dayjs";

let running = false;

// // MySQL 데이터베이스 연결 설정

const pool = mysql.createPool({
  host: process.env.DB_HOST || "taulftp.mycafe24.com",
  user: process.env.DB_USER || "taulftp",
  password: process.env.DB_PASSWORD || "dkffjqb@82",
  database: process.env.DB_NAME || "taulftp",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || "10", 10),
});


//카페 답변받고 주석 풀어야함
export const latestTransactions = async () => {
  const timerLabel = "latestTransactions 실행 시간";
  console.time(timerLabel);
  try {
    const result = await popbillBank.AutolatestTransactions();
    console.log("은행거래내역 업데이트 완료");
  } catch (error) {
    console.error("latestTransactions 처리 중 오류:", error.message);
  }
};

//////0327 10분간격으로 실행하다록 설정
// const executeScheduledTasks = async () => {
//   const now = new Date();
//   const currentHour = now.getHours(); // 현재 시간
//   const currentMinute = now.getMinutes();
//   // console.log(now + '/' + currentMinute + ' 자동 스케쥴러10분가격으로 실행')
//   // 분이 10의 배수가 아닌 경우 리턴
//   // 3, 5, 10 중에서 랜덤으로 하나 선택
//   const intervals = [10];
//   const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];


//   if (currentMinute % randomInterval !== 0) {
//     return; // 조건에 맞지 않으면 실행하지 않음
//   }

//   try {
//     console.log({ currentHour: currentHour, currentMinute: currentMinute });
//     // 현재 시간에 맞는 작업을 조회 (execute_hour가 현재 시각과 일치하고 is_executed가 FALSE인 작업)
//     const [rows] = await pool.query(
//       `SELECT * FROM filmmakersjobs 
//              WHERE execute_hour = ? 
//                AND execute_minute < ? 
//                AND is_executed = FALSE
//                AND play = 'Y'
//                `,
//       [currentHour, currentMinute]
//     );
//     // 현재 시간에 맞는 작업 실행
//     for (const job of rows) {
//       const taskDescription = job.task_description.toString(); // 버퍼를 문자열로 변환
//       console.log(`Executing job: ${job.task_description} at ${currentHour}:00`);
//       // 실제 작업 실행 로직 추가 (예: 이메일 발송, 데이터 처리 등)
//       if (taskDescription === "filmmakers") {
//         console.log("edit start");
//         const result = await filmmakersContoller.postEdit();
//         console.log("result", result);
//         await pool.query(`UPDATE filmmakersjobs SET is_executed = TRUE ,result='${result.message}' WHERE id = ?`, [job.id]);
//         console.log(`Job ${job.id} completed`);
//       }
//       // 작업 완료 후 is_executed 업데이트
//     }
//   } catch (error) {
//     console.error("Error executing scheduled tasks:", error);
//   }
// };


const runningJobs = new Set();

const executeScheduledTasks = async () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  try {
    // 1. 현재 시각 조건에 맞고 아직 실행되지 않은(is_executed = 0) 작업 조회
    const [rows] = await pool.query(
      `SELECT id, execute_minute, task_description FROM filmmakersjobs 
       WHERE execute_hour = ? 
         AND execute_minute <= ? 
         AND is_executed = 0
         AND play = 'Y'`,
      [currentHour, currentMinute]
    );

    if (rows.length === 0) return;

    for (const job of rows) {
      // 안전장치: 이미 메모리 상에서 실행 중인 작업이라면 중복 실행 방지 건너뛰기
      if (runningJobs.has(job.id)) {
        continue;
      }

      // 작업 실행 잠금(Lock) 등록
      runningJobs.add(job.id);

      // 즉시 비동기로 실행 시켜서 다음 row 처리가 블로킹되지 않도록 분리
      (async () => {
        try {
          const taskDescription = job.task_description ? job.task_description.toString() : "";

          if (taskDescription === "filmmakers") {
            // [랜덤 지연] 0초 ~ 180초(3분) 사이 무작위 대기 (사람처럼 보이게 설정)
            const randomDelay = Math.floor(Math.random() * 180000);
            console.log(`[Job ID: ${job.id}] ${randomDelay / 1000}초 후 랜덤 실행 예정 (설정 분: ${job.execute_minute}분)`);
            
            await new Promise(resolve => setTimeout(resolve, randomDelay));

            // 외부 API/컨트롤러 호출
            console.log(`[Job ID: ${job.id}] 외부 사이트 수정 요청 시작`);
            const result = await filmmakersContoller.postEdit();
            console.log(`[Job ID: ${job.id}] 결과:`, result);

            // 2. 성공 후 DB 업데이트 (SQL 인젝션 방지 파라미터 바인딩)
            const successMessage = result && result.message ? result.message : "수정했습니다.";
            await pool.query(
              `UPDATE filmmakersjobs SET is_executed = 1, result = ? WHERE id = ?`,
              [successMessage, job.id]
            );
            console.log(`[Job ID: ${job.id}] DB 업데이트 완료`);
          }
        } catch (jobError) {
          console.error(`[Job ID: ${job.id}] 작업 실행 중 에러 발생:`, jobError);
          // 실패 시 다음 스케줄러가 다시 시도할 수 있도록 에러 메시지만 남기고 is_executed는 0으로 유지하거나, 
          // 실패 마킹을 원하시면 아래 주석을 해제하세요.
          /*
          await pool.query(
            `UPDATE filmmakersjobs SET result = ? WHERE id = ?`,
            [jobError.message || "실패", job.id]
          );
          */
        } finally {
          // 작업이 끝나면 (성공이든 실패든) 잠금 해제
          runningJobs.delete(job.id);
        }
      })();
    }
  } catch (error) {
    console.error("스케줄러 메인 루프 에러:", error);
  }
};



// jobs 테이블 초기화 함수 (매일 자정에 실행)
const resetJobsTable = async () => {
  try {
    await pool.query("UPDATE filmmakersjobs SET is_executed = FALSE");
    console.log("jobs 테이블이 자정에 리셋되었습니다.");
  } catch (error) {
    console.error("Error resetting jobs table:", error);
  }
};

// 스케줄러 설정
const startSchedules = async () => {
  cron.schedule("* * * * *", executeScheduledTasks);
  // 매일 자정에 jobs 테이블을 리셋하는 스케줄러
  cron.schedule("0 0 * * *", resetJobsTable);
  // cron.schedule("* * * * *", latestTransactions);
  // cron.schedule("*/10 * * * *", latestTransactions);
  let running = false;
cron.schedule("0 */5 * * * *", async () => {
  if (running) return;
  running = true;
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  console.log(`[${now}] 🔄 latestTransactions 실행 시작`);

  try {
    await latestTransactions();
    console.log(`[${now}] ✅ latestTransactions 완료`);
  } catch (err) {
    console.error(`[${now}] ❌ latestTransactions 실패:`, err.message);
  } finally {
    running = false;
  }
}, { timezone: "Asia/Seoul" });
};

export default { startSchedules };
