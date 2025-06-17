
// services/schedulesService.js
import sql from '../../lib/crm/sql.js';

const getAllSetup = async () => {
    const query = 'SELECT * FROM schedules';
    return await sql.executeQuery(query);
};

const getSetupID = async (TableName) => {
    console.log('getSetupTable',TableName)
    const query = `SELECT * FROM ${TableName}`;
    const result = await sql.executeQuery(query);
    return result;
};

const getScheduleById = async (id) => {
    const query = 'SELECT * FROM schedules WHERE id = ?';
    const result = await sql.executeQuery(query, [id]);
    return result[0];
};


const getTotalSales=async(month)=>{

    
    const query=`SELECT (SELECT SUM(estPrice) FROM schedules WHERE LEFT(start, 7) = '${month}' AND csKind = '2') AS TOTALSALES, (SELECT SUM(spend) FROM AdPerformance WHERE LEFT(date, 7) = '${month}') AS TOTALADCOST;`
    const result = await sql.executeQuery(query);
    console.log('getTotalSales',result[0])
    return result[0];
}

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
    getTotalSales
    // createSchedule,
    // getScheduleByMonth,
    // updateSchedule,
    // deleteSchedule,
};
