import cron from 'node-cron';
import mysql from 'mysql2/promise';
import filmmakersContoller from '../controllers/filmmakers.js';

// MySQL 데이터베이스 연결 설정
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'taulftp.mycafe24.com',
    user: process.env.DB_USER || 'taulftp',
    password: process.env.DB_PASSWORD || 'dkffjqb@82',
    database: process.env.DB_NAME || 'taulftp',
    port: "3306",
    multipleStatements: true,
    connectionLimit: 10 // 풀 내에서 최대 10개의 연결을 허용
});

// // 작업 실행 함수 (매 시간마다 실행)
const executeScheduledTasks = async () => {
    const now = new Date();
    const currentHour = now.getHours();  // 현재 시간
    const currentMinute = 0;             // 매 시간마다 00분에 실행

    try {
        console.log({ currentHour: currentHour, currentMinute: currentMinute })
        // 현재 시간에 맞는 작업을 조회 (execute_hour가 현재 시각과 일치하고 is_executed가 FALSE인 작업)
        const [rows] = await pool.query(
            'SELECT * FROM filmmakersjobs WHERE execute_hour = ?  AND is_executed = FALSE',
            [currentHour]
        );
        // console.log(rows)

        // 현재 시간에 맞는 작업 실행
        for (const job of rows) {

            const taskDescription = job.task_description.toString(); // 버퍼를 문자열로 변환
            console.log(`Executing job: ${job.task_description} at ${currentHour}:00`);

            // 실제 작업 실행 로직 추가 (예: 이메일 발송, 데이터 처리 등)
            if (taskDescription === 'filmmakers') {
                console.log('edit start')
                const result = await filmmakersContoller.postEdit()
                console.log('result', result)
                await pool.query(`UPDATE filmmakersjobs SET is_executed = TRUE ,result='${result.message}' WHERE id = ?`, [job.id]);
                // console.log(`Job ${job.id} completed`);
            }

            // 작업 완료 후 is_executed 업데이트

        }
    } catch (error) {
        console.error('Error executing scheduled tasks:', error);
    }
};

// jobs 테이블 초기화 함수 (매일 자정에 실행)
const resetJobsTable = async () => {
    try {
        await pool.query('UPDATE filmmakersjobs SET is_executed = FALSE');
        console.log('jobs 테이블이 자정에 리셋되었습니다.');
    } catch (error) {
        console.error('Error resetting jobs table:', error);
    }
};

// 스케줄러 설정
const startSchedules =async () => {

    // 매 분마다 실행되어 현재 시간에 맞는 작업 실행
    // cron.schedule('* * * * *', executeScheduledTasks);
    // 매 시간마다 00분에 실행되는 작업 스케줄러
    cron.schedule('0 * * * *', executeScheduledTasks);

    // 매일 자정에 jobs 테이블을 리셋하는 스케줄러
    cron.schedule('0 0 * * *', resetJobsTable);
}

export default { startSchedules}; 