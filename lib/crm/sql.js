import mysql from 'mysql2';
import path from 'path';



const __dirname = path.dirname(new URL(import.meta.url).pathname);
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'taulftp.mycafe24.com',
    user: process.env.DB_USER || 'taulftp',
    password: process.env.DB_PASSWORD || 'dkffjqb@82',
    database: process.env.DB_NAME || 'taulftp',
    port: "3306",
    multipleStatements: true,
    connectionLimit: 10 // 풀 내에서 최대 10개의 연결을 허용
});


async function add_field(tableName, fieldName, fieldType) {
    if (!fieldName || !fieldType) {
        return res.status(400).json({ message: 'Field name and type are required' });
    }
    const sql = `ALTER TABLE ${tableName}  ADD COLUMN ${mysql.escapeId(fieldName)}${fieldType}`;
    let result = await executeQuery(sql)
    return (result)
};

async function delete_field(tableName, fieldName) {
    if (!fieldName) {
        return ({ message: 'Field name is required' });
    }
    const sql = `ALTER TABLE ${tableName} DROP COLUMN ${mysql.escapeId(fieldName)}`;
    let result = await executeQuery(sql)
    return (result)
}
function executeQuery2(query, params, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            return callback(err, null);  // 연결 오류 발생 시 콜백으로 오류 전달
        }

        // 쿼리 실행
        connection.query(query, params, (err, results) => {
            connection.release();  // 연결 반환
            if (err) {
                return callback(err, null);  // 쿼리 오류 발생 시 콜백으로 오류 전달
            }
            callback(null, results);  // 쿼리 성공 시 결과 전달
        });
    });
}
async function executeQuery(query, params) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                return reject(err); // 연결 오류 발생 시 Promise reject
            }
            console.log({ 'executeQuery': '', query: query, params: params });

            connection.query(query, params, (err, results) => {
                connection.release(); // 연결 반환
                if (err) {
                    console.log('err', err);
                    return reject(err); // 쿼리 오류 발생 시 Promise reject
                }

                // 쿼리 타입을 분석하여 처리 방법을 결정
                const queryType = query.trim().split(' ')[0].toUpperCase();

                if (queryType === 'SELECT') {
                    // SELECT 문인 경우 결과를 객체로 변환
                    let obj = results.map(row => {
                        let newJsonObj = {};
                        Object.keys(row).forEach(key => {
                            newJsonObj[key] = String(row[key]);  // 모든 값을 문자열로 변환
                        });
                        return newJsonObj;
                    });
                    // console.log('executeQuery results', obj);
                    resolve(obj); // 쿼리 성공 시 Promise resolve
                } else {
                    // SELECT 문이 아닌 경우, 결과를 그대로 반환
                    // console.log('executeQuery results', results);
                    resolve(results); // 쿼리 성공 시 Promise resolve
                }
            });
        });
    });
}


// async function executeQueryBk(query) {
//     return new Promise((resolve, reject) => {
//         console.log('query',query)
//         pool.query(query, (err, result) => {
//             if (err) {
//                 console.error('executeQuery error:', err);
//                 return reject(err);  // 에러 발생 시 reject로 전달
//             }

//             let obj = result.map(row => {
//                 let newJsonObj = {};
//                 Object.keys(row).forEach(key => {
//                     newJsonObj[key] = String(row[key]);  // 모든 값을 문자열로 변환
//                 });
//                 return newJsonObj;
//             });

//             resolve(obj);  // 결과를 resolve로 반환
//         });
//     });
// }


async function getmetaFieldLastKey() {
    const query = `SELECT id +1 as 'id' FROM meta_fields ORDER BY id DESC LIMIT 1`;
    const result = await executeQuery(query)
    return result[0]?.id
}

export default {
    add_field,
    delete_field,
    executeQuery,
    executeQuery2,
    getmetaFieldLastKey
}
