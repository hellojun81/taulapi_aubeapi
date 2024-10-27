// services/customersService.js
import sql from '../lib/sql.js';
import dayjs from 'dayjs';

// 모든 고객 가져오기
const getCustomers = async () => {
    const query = 'SELECT * FROM Customers ORDER BY customerName';
    return await sql.executeQuery(query);
};

// 특정 고객 가져오기
const getCustomerById = async (customerName) => {

    if (customerName == undefined) {
        customerName = ''
    }
    console.log('customerService customerName', customerName)

    const query = `SELECT * FROM Customers WHERE customerName LIKE '%${customerName}%'
    or contactPerson Like '%${customerName}%' or notes like '%${customerName}%'`;
    // console.log(query)
    try {
        const result = await sql.executeQuery(query, );
        // console.log('Service result', result);
        return result;
    } catch (error) {
        console.error('Error executing query', error);
        throw error; // 에러를 다시 던져 호출자가 처리할 수 있도록 합니다.
    }
};


// 고객 추가
const addCustomer = async (customer) => {
    const checkquery = `select * from Customers where customerName='${customer.customerName}'`
    const checkresult = await sql.executeQuery(checkquery)
    console.log('addCustomer=', checkresult.length)
    customer.inboundDate=dayjs(customer.inboundDate).format('YYYY-MM-DD')
    if (checkresult.length === 0) {
        const query = 'INSERT INTO Customers (customerName, contactPerson, position, phone, email, leadSource, inboundDate, businessNumber, representative, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const params = [
            customer.customerName,
            customer.contactPerson,
            customer.position,
            customer.phone,
            customer.email,
            customer.leadSource,
            customer.inboundDate,
            customer.businessNumber,
            customer.representative,
            customer.location,
            customer.notes
        ];
        const result = await sql.executeQuery(query, params);
        return { msg:'고객 추가 완료',id: result.insertId, ...customer };
    } else {
        return {msg:'동일 거래처명이 존재합니다'}
    }

};

// 고객 수정
const updateCustomer = async (id, customer) => {
    customer.inboundDate=dayjs(customer.inboundDate).format('YYYY-MM-DD')
    const query = 'UPDATE Customers SET customerName = ?, contactPerson = ?, position = ?, phone = ?, email = ?, leadSource = ?, inboundDate = ?, businessNumber = ?, representative = ?, location = ?, notes = ? WHERE id = ?';
    const params = [
        customer.customerName,
        customer.contactPerson,
        customer.position,
        customer.phone,
        customer.email,
        customer.leadSource,
        customer.inboundDate,
        customer.businessNumber,
        customer.representative,
        customer.location,
        customer.notes,
        id
    ];
    const result = await sql.executeQuery(query, params);
    return result.affectedRows > 0;
};

// 고객 삭제
const deleteCustomer = async (id) => {
    const query = 'DELETE FROM Customers WHERE id = ?';
    const result = await sql.executeQuery(query, [id]);
    return result.affectedRows > 0;
};

export default {
    getCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer,
};
