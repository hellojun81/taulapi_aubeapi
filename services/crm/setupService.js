// services/schedulesService.js
import sql from "../../lib/crm/sql.js";

const getAllSetup = async () => {
  const query = "SELECT * FROM schedules";
  return await sql.executeQuery(query);
};

const getSetupID = async (TableName) => {
  // console.log('getSetupTable',TableName)
  const query = `SELECT * FROM ${TableName}`;
  const result = await sql.executeQuery(query);
  return result;
};

// const getScheduleById = async (id) => {
//   const query = "SELECT * FROM schedules WHERE id = ?";
//   const result = await sql.executeQuery(query, [id]);
//   return result[0];
// };

const getTotalSales = async (month) => {
  if (!/^\d{4}-\d{2}$/.test(month || "")) {
    throw new Error("SearchMonth는 YYYY-MM 형식이어야 합니다.");
  }

  const year = month.slice(0, 4);
  const previousYearMonth = `${Number(year) - 1}-${month.slice(5, 7)}`;
  const query = `
    SELECT
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '2'), 0) AS TOTALSALES,
      COALESCE((SELECT SUM(spend) FROM AdPerformance WHERE LEFT(date, 7) = ?), 0) AS TOTALADCOST,
      (SELECT COUNT(*) FROM schedules WHERE csKind = '2' AND LEFT(start, 7) = ?) AS TOTALRENTCNT,
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 4) = ? AND csKind = '2'), 0) AS TOTALYEARSALES,
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '2'), 0) AS PREVIOUSYEARSALES;
  `;
  const result = await sql.executeQuery(query, [month, month, month, year, previousYearMonth]);
  // console.log('getTotalSales',result[0])
  return result[0];
};

// const createSchedule = async (schedule) => {
//     const { calendarId, title,  start, end, category, customerName, rentPlace, bgColor } = schedule;
//     const query = `INSERT INTO schedules (calendarId, title, start, end, category, customerName, rentPlace, bgColor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
//     const result = await sql.executeQuery(query, [calendarId, title,  start, end, category, customerName, rentPlace, bgColor]);
//     return { id: result.insertId, ...schedule };
// };

// const getScheduleByMonth = async (Month) => {
//     const query = 'SELECT * FROM schedules WHERE left(startDate,7) = ?';
//     const result = await sql.executeQuery(query, [Month]);
//     console.log(result)
//     return result;
// };

// const updateSchedule = async (id, schedule) => {
//     const query = 'UPDATE schedules SET ? WHERE id = ?';
//     const result = await sql.executeQuery(query, [schedule, id]);
//     return result.affectedRows > 0;
// };

// const deleteSchedule = async (id) => {
//     const query = 'DELETE FROM schedules WHERE id = ?';
//     const result = await sql.executeQuery(query, [id]);
//     return result.affectedRows > 0;
// };

export default {
  getAllSetup,
  getSetupID,
  getTotalSales,
  // createSchedule,
  // getScheduleByMonth,
  // updateSchedule,
  // deleteSchedule,
};
