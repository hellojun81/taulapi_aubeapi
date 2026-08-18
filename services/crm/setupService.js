// services/schedulesService.js
import sql from "../../lib/crm/sql.js";
import dayjs from "dayjs";

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
  const previousYear = String(Number(year) - 1);
  const previousYearMonth = `${Number(year) - 1}-${month.slice(5, 7)}`;
  const query = `
    SELECT
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '2'), 0) AS TOTALSALES,
      COALESCE((SELECT SUM(spend) FROM AdPerformance WHERE LEFT(date, 7) = ?), 0) AS TOTALADCOST,
      (SELECT COUNT(*) FROM schedules WHERE csKind = '2' AND LEFT(start, 7) = ?) AS TOTALRENTCNT,
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 4) = ? AND csKind = '2'), 0) AS TOTALYEARSALES,
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 4) = ? AND csKind = '2'), 0) AS PREVIOUSYEARTOTALSALES,
      COALESCE((SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '2'), 0) AS PREVIOUSYEARSALES,
      (SELECT COUNT(*) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '1') AS PREVIOUSYEARMONTHSIMPLEINQUIRYCOUNT,
      (SELECT COUNT(*) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '2') AS PREVIOUSYEARMONTHRENTCOUNT,
      (SELECT COUNT(*) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '3') AS PREVIOUSYEARMONTHVISITCOUNT,
      (SELECT COUNT(*) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '4') AS PREVIOUSYEARMONTHTENTATIVECOUNT,
      (SELECT COUNT(*) FROM schedules WHERE LEFT(start, 7) = ? AND csKind = '5') AS PREVIOUSYEARMONTHOTHERCOUNT;
  `;
  const result = await sql.executeQuery(query, [
    month,
    month,
    month,
    year,
    previousYear,
    previousYearMonth,
    previousYearMonth,
    previousYearMonth,
    previousYearMonth,
    previousYearMonth,
    previousYearMonth,
  ]);
  const today = dayjs().startOf("day");
  const yearEnd = today.endOf("year").startOf("day");

  const collectBookedDates = (schedules, rangeStart, rangeEnd) => {
    const dates = new Set();

    schedules.forEach((schedule) => {
      let cursor = dayjs(schedule.start).startOf("day");
      const scheduleEnd = dayjs(schedule.end).startOf("day");

      if (cursor.isBefore(rangeStart)) cursor = rangeStart;
      const lastDate = scheduleEnd.isAfter(rangeEnd) ? rangeEnd : scheduleEnd;

      while (!cursor.isAfter(lastDate)) {
        dates.add(cursor.format("YYYY-MM-DD"));
        cursor = cursor.add(1, "day");
      }
    });

    return dates;
  };

  const rentalSchedules = await sql.executeQuery(
    `SELECT start, end
     FROM schedules
     WHERE csKind = '2'
       AND end >= ?
       AND start <= ?`,
    [today.format("YYYY-MM-DD"), yearEnd.format("YYYY-MM-DD")]
  );
  const bookedDates = collectBookedDates(rentalSchedules, today, yearEnd);

  const selectedMonthStart = dayjs(`${month}-01`).startOf("day");
  const selectedMonthEnd = selectedMonthStart.endOf("month").startOf("day");
  const availableMonthStart = selectedMonthStart.isBefore(today) ? today : selectedMonthStart;
  let monthBookedDates = new Set();
  let availableMonthCalendarDays = 0;

  if (!availableMonthStart.isAfter(selectedMonthEnd)) {
    const monthlyRentalSchedules = await sql.executeQuery(
      `SELECT start, end
       FROM schedules
       WHERE csKind = '2'
         AND end >= ?
         AND start <= ?`,
      [availableMonthStart.format("YYYY-MM-DD"), selectedMonthEnd.format("YYYY-MM-DD")]
    );
    monthBookedDates = collectBookedDates(monthlyRentalSchedules, availableMonthStart, selectedMonthEnd);
    availableMonthCalendarDays = selectedMonthEnd.diff(availableMonthStart, "day") + 1;
  }

  const remainingCalendarDays = yearEnd.diff(today, "day") + 1;
  return {
    ...result[0],
    MONTHBOOKEDDAYCOUNT: monthBookedDates.size,
    MONTHAVAILABLESALESDAYS: Math.max(0, availableMonthCalendarDays - monthBookedDates.size),
    BOOKEDDAYCOUNT: bookedDates.size,
    AVAILABLESALESDAYS: Math.max(0, remainingCalendarDays - bookedDates.size),
  };
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
