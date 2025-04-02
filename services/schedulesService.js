
// services/schedulesService.js
import sql from '../lib/sql.js';
import dayjs from 'dayjs';

const selectqueryinit = `A.id, B.customerName,CONCAT('[', C.title, ']', B.customerName) AS title, A.start,A.end,A.rentPlace,A.startTime,A.endTime,A.userInt,A.estPrice
    ,A.gubun,A.etc,A.csKind,C.title as cskindTitle,C.category,C.bgcolor ,B.notes as customerEtc,B.contactPerson ,A.created_at ,A.ADmedia,D.name as AD_NAME
    FROM schedules A INNER JOIN Customers B ON A.customerName = B.id  INNER JOIN csKind C ON A.csKind = C.id INNER JOIN ADmedia D ON A.ADmedia=D.keycode`



const getAllSchedules = async () => {
    const query = `SELECT ${selectqueryinit}`;
    return await sql.executeQuery(query);

};
const getCustomerID = async (CustomerName) => {
    console.log('getCustomerID')
    const query = 'SELECT id FROM Customers where customerName = ?';
    const result = await sql.executeQuery(query, CustomerName);
    return result[0]
}

const createSchedule = async (schedule) => {
    const { calendarId, csKind, ADmedia, NewTitle, start, end, startTime, endTime, userInt, estPrice, gubun, etc, customerName, rentPlace } = schedule;
    const customerId = await getCustomerID(customerName)
    // console.log({start:start,end:end,customerName:customerName,csKind:csKind})
    const CheckSchedule = await GetCheckSchedule(start, end, customerName, csKind)


    console.log('CheckSchedulelength', CheckSchedule.length)
    if (CheckSchedule.length === 0) {
        const query = `INSERT INTO schedules (calendarId, csKind,ADmedia,title, start, end, startTime,endTime, userInt,estPrice,gubun,etc, customerName, rentPlace)VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        const result = await sql.executeQuery(query, [calendarId, csKind, ADmedia, NewTitle, start, end, startTime, endTime, userInt, estPrice, gubun, etc, customerId.id, rentPlace]);
        return '등록완료'
    } else {
        return start + ' 에 [' + customerName + '] 이미 등록 되어있습니다.'
    }
};
const getScheduleByCoustomerId = async (id) => {
    const query = `SELECT * from schedules WHERE customerName = ?`;
    const result = await sql.executeQuery(query, id);
    return result;
};
const getScheduleById = async (id) => {
    const query = `SELECT ${selectqueryinit} WHERE A.id = ?`;
    const result = await sql.executeQuery(query, id);
    console.log("getScheduleById", result)
    return result[0];
};

const GetCheckSchedule = async (startDate, endDate, customerName, csKind) => {
    if (customerName == undefined) { customerName = '' }
    let query
    if (csKind == 0) {
        query = `SELECT ${selectqueryinit} WHERE A.start >= '${startDate}' AND A.end <= '${endDate}' and ( B.customerName like '%${customerName}%' or  A.etc like '%${customerName}%' )`;

    } else {
        query = `SELECT ${selectqueryinit} WHERE A.start >= '${startDate}' AND A.end <= '${endDate}' and ( B.customerName like '%${customerName}%' or  A.etc like '%${customerName}%') and A.csKind = ${parseInt(csKind)} `;

    }
    const result = await sql.executeQuery(query);
    return result;
};

const getcsByDate = async (startDate, endDate, customerName, csKind) => {
    if (customerName == undefined) { customerName = '' }
    console.log('getcsByDate', typeof parseInt(csKind))
    let query
    if (csKind == 0) {
      
        query = `SELECT ${selectqueryinit} WHERE A.created_at >= '${startDate} 00:00:00' AND A.created_at <= '${endDate} 23:59:59' and ( B.customerName like '%${customerName}%' or  A.etc like '%${customerName}%' )`;
    } else {
        query = `SELECT ${selectqueryinit} WHERE A.created_at >= '${startDate} 00:00:00' AND A.created_at <= '${endDate} 23:59:59' and ( B.customerName like '%${customerName}%' or  A.etc like '%${customerName}%') and A.csKind = ${parseInt(csKind)} `;
    }
    const result = await sql.executeQuery(query);
    return result;
};



const getScheduleByMonth = async (Month, sort) => {
    const year = Month.substring(0, 4)
    const month = Month.substring(5, 7) // 9월이지만 0부터 시작하므로 8
    const date = new Date(year, month);
    // 이전 달
    const previousMonth = new Date(date);
    previousMonth.setMonth(date.getMonth() - 1);
    // 다음 달
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1);
    const NewPrevMonth = previousMonth.toISOString().slice(0, 7)
    const NewNextMonth = nextMonth.toISOString().slice(0, 7)
    console.log('sort', sort)

    let Sort2 = 'A.start'
    let Sortby = 'and C.calView=1 ORDER BY A.start, C.id'

    let Newselectqueryinit
    Newselectqueryinit = `A.id, B.customerName,CONCAT('[', C.title, ']', B.customerName) AS title, A.start,A.end,A.rentPlace,A.startTime,A.endTime,A.userInt,A.estPrice
    ,A.gubun,A.etc,A.csKind,C.title as cskindTitle,C.category,C.bgcolor ,B.notes as customerEtc,B.contactPerson ,A.created_at ,A.ADmedia
    FROM schedules A INNER JOIN Customers B ON A.customerName = B.id  INNER JOIN csKind C ON A.csKind = C.id`

    switch (sort) {
        case "CREATE":
            Sort2 = "A.created_at"
            Newselectqueryinit = `A.id, B.customerName,CONCAT('[', C.title, ']', B.customerName) AS title, A.start,A.end,A.rentPlace,A.startTime,A.endTime,A.userInt,A.estPrice
    ,A.gubun,A.etc,A.csKind,C.title as cskindTitle,C.category,C.bgcolor ,B.notes as customerEtc,B.contactPerson ,A.created_at as start ,A.created_at as end , A.ADmedia
    FROM schedules A INNER JOIN Customers B ON A.customerName = B.id  INNER JOIN csKind C ON A.csKind = C.id`
            break;
        case "START":
            Sort2 = 'A.start'
            break;
        case "END":
            Sort2 = 'A.end'
            break;
        case "CREATECNT":
            Sort2 = "A.created_at"
            Newselectqueryinit = ` 'time' as category, DATE(A.created_at) AS start, DATE(A.created_at) AS end,A.ADmedia,CONCAT(B.name, '*', COUNT(*), '건') AS title FROM schedules A JOIN ADmedia B ON A.ADmedia = B.keycode JOIN csKind C ON C.id=1  and A.csKind=C.id `
            Sortby ='GROUP BY created_at, A.ADmedia ORDER BY created_at, A.ADmedia'
            break;
    }

    if (sort === undefined) {
        Sort2 = 'A.start'
    }
    const query = `SELECT ${Newselectqueryinit}  WHERE LEFT(${Sort2}, 7) BETWEEN '${NewPrevMonth}' AND '${NewNextMonth}' ${Sortby} `

    console.log('querytest', query)
    const result = await sql.executeQuery(query);
    // console.log(result)
    return result;
};
const updateCsKind = async (update_ID) => {
    await Inint_csKind()
    console.log(update_ID)
    const query = `UPDATE csKind SET calView=1 where id IN(${update_ID})`;
    const result = await sql.executeQuery(query);
    return result.affectedRows > 0;
};
const Inint_csKind = async () => {
    const query = 'UPDATE csKind SET calView=0';
    const result = await sql.executeQuery(query);
    return result.affectedRows > 0;
}

const updateSchedule = async (id, schedule) => {

    console.log('updateSchedule', schedule)
    if (schedule.customerName) {
        const customerId = await getCustomerID(schedule.customerName)
        schedule.customerName = customerId.id
    }


    schedule.start = dayjs(schedule.start).format('YYYY-MM-DD');
    schedule.end = dayjs(schedule.end).format('YYYY-MM-DD');

    console.log('schedule.customerName', schedule.customerName)
    const query = 'UPDATE schedules SET ? WHERE id = ?';
    const result = await sql.executeQuery(query, [schedule, id]);
    return result.affectedRows > 0;
};



const deleteSchedule = async (id) => {
    const query = 'DELETE FROM schedules WHERE id = ?';
    const result = await sql.executeQuery(query, [id]);
    return result.affectedRows > 0;
};

export default {
    getAllSchedules,
    createSchedule,
    getScheduleByCoustomerId,
    getScheduleById,
    getScheduleByMonth,
    updateSchedule,
    deleteSchedule,
    updateCsKind,
    getcsByDate,
    Inint_csKind
};
