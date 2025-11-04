import mysql from "mysql2";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "taulftp.mycafe24.com",
  user: process.env.DB_USER || "taulftp",
  password: process.env.DB_PASSWORD || "dkffjqb@82",
  database: process.env.DB_NAME || "taulftp",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || "10", 10),
});

async function add_field(tableName, fieldName, fieldType) {
  if (!fieldName || !fieldType) {
    return res.status(400).json({ message: "Field name and type are required" });
  }
  const sql = `ALTER TABLE ${tableName}  ADD COLUMN ${mysql.escapeId(fieldName)}${fieldType}`;
  let result = await executeQuery(sql);
  return result;
}

async function delete_field(tableName, fieldName) {
  if (!fieldName) {
    return { message: "Field name is required" };
  }
  const sql = `ALTER TABLE ${tableName} DROP COLUMN ${mysql.escapeId(fieldName)}`;
  let result = await executeQuery(sql);
  return result;
}

async function executeQuery(query, params) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject(err); // 연결 오류 발생 시 Promise reject
      }
       connection.query(query, params, (err, results) => {
        connection.release(); // 연결 반환
        if (err) {
          return reject(err); // 쿼리 오류 발생 시 Promise reject
        }
        // 쿼리 타입을 분석하여 처리 방법을 결정
        const queryType = query.trim().split(" ")[0].toUpperCase();
        if (queryType === "SELECT") {
          let obj = results.map((row) => {
            let newJsonObj = {};
            Object.keys(row).forEach((key) => {
              newJsonObj[key] = String(row[key]); // 모든 값을 문자열로 변환
            });
            return newJsonObj;
          });
          resolve(obj); // 쿼리 성공 시 Promise resolve
        } else {
          resolve(results); // 쿼리 성공 시 Promise resolve
        }
      });
    });
  });
}

async function getmetaFieldLastKey() {
  const query = `SELECT id +1 as 'id' FROM meta_fields ORDER BY id DESC LIMIT 1`;
  const result = await executeQuery(query);
  return result[0]?.id;
}
const db = pool.promise();

export default {
  add_field,
  delete_field,
  executeQuery,
  // executeQuery2,
  getmetaFieldLastKey,
  db,
  pool,
};
