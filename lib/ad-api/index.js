import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// console.log('process.env.DB_HOST',process.env.DB_HOST)

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'taulftp.mycafe24.com',
  user: process.env.DB_USER || 'taulftp',
  password: process.env.DB_PASSWORD || 'dkffjqb@82',
  database: process.env.DB_NAME || 'taulftp',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
});

export default pool;
