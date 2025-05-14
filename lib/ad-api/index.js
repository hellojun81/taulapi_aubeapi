import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

console.log('process.env.DB_HOST',process.env.DB_HOST)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
});

export default pool;
