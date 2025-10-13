// services/customersService.js
import sql from "../../lib/crm/sql.js";
import dayjs from "dayjs";

// 모든 고객 가져오기
const getBankTransactions = async (start, end, keyword, onlyDeposit) => {
  const where = [];
  const params = [];
  console.log({ getBankTransactions: start, end: end, keyword: keyword });
  // 날짜 범위 조건
  if (start) {
    where.push("DATE(tx_datetime) >= ?");
    params.push(start);
  }
  if (end) {
    where.push("DATE(tx_datetime) <= ?");
    params.push(end);
  }

  // 입금만 보기
  if (onlyDeposit) {
    where.push("(deposit_amount IS NOT NULL AND deposit_amount > 0)");
  }

  // 검색어 (은행명, 메모, 계좌번호 등)
  if (keyword) {
    where.push(
      "(summary LIKE ? OR memo LIKE ? OR bank_name LIKE ? OR account_no LIKE ?)"
    );
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const query = `
    SELECT id,tx_datetime,summary,deposit_amount, bank_name,memo,account_no,bkcode,   
      channel, flow_type,    withdraw_amount, balance
            
    FROM BankTransactions
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY tx_datetime DESC
    LIMIT 1000
  `;
  return await sql.executeQuery(query, params);
};

// 고객 삭제 고객삭제는 실제 데이터 삭제가 아닌 숨기기로 처리
const deleteCustomer = async (id) => {
  // const query = 'DELETE FROM Customers WHERE id = ?';
  const query = "UPDATE Customers SET dealYN = 'N' WHERE id = ?";

  const result = await sql.executeQuery(query, [id]);
  return result.affectedRows > 0;
};

export default {
  getBankTransactions,
  deleteCustomer,
};
