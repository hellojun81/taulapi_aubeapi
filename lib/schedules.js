// server.js (백엔드 서버 설정 파일)
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


// GET 요청: 모든 스케줄 데이터 가져오기
app.get('/api/schedules', (req, res) => {
  const sql = 'SELECT * FROM schedules';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// POST 요청: 새로운 스케줄 추가
app.post('/api/schedules', (req, res) => {

  const { calendarId, title, body, start, end, category, isAllDay, location, state } = req.body;
  const sql = 'INSERT INTO schedules (calendarId, title, body, start, end, category, isAllDay, location, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [calendarId, title, body, start, end, category, isAllDay, location, state], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: results.insertId, ...req.body });
  });
});

// DELETE 요청: 스케줄 삭제
app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM schedules WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Schedule deleted successfully' });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
