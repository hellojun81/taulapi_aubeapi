import popbill from "popbill";
import express from "express";
import sql from "../../lib/crm/sql.js";

const router = express.Router();

popbill.config({
  LinkID: process.env.POPBILL_LINK_ID, // 링크아이디
  SecretKey: process.env.POPBILL_SECRET_KEY, // 비밀키
  IsTest: true, // 연동환경 설정, true-테스트, false-운영(Production), (기본값:false)
  IPRestrictOnOff: true, // 통신 IP 고정, true-사용, false-미사용, (기본값:true)
  UseStaticIP: false, // 팝빌 API 서비스 고정 IP 사용여부, 기본값(false)
  UseLocalTimeYN: true, // 로컬시스템 시간 사용여부, true-사용, false-미사용, (기본값:true)
  defaultErrorHandler: function (Error) {
    console.log("Error Occur : [" + Error.code + "] " + Error.message);
  },
});

var easyFinBankService = popbill.EasyFinBankService(); // 계좌조회 서비스 객체 초기화

export const saveTransactions = async (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { message: "저장할 거래 내역이 없습니다.", affectedRows: 0 };
  }
  console.log("transactions", transactions);
  // 1. 거래 내역 객체 배열을 2차원 배열 (SQL VALUES 형식)로 변환
  const valuesForBulkInsert = transactions.map((item) => [
    item.tid,
    item.trserial,
    item.accountID,
    parseFloat(item.balance),
    parseFloat(item.accIn),
    parseFloat(item.accOut),
    item.remark1,
    item.remark2,
    item.remark3,
    item.remark4,
    item.memo,
    // 🚨 날짜/시간 필드를 JS Date 객체로 변환하여 전달 (MySQL 드라이버가 자동으로 형식 처리)
    // 월은 0부터 시작하므로 -1
    new Date(
      item.trdate.substring(0, 4),
      item.trdate.substring(4, 6) - 1,
      item.trdate.substring(6, 8)
    ), // trdate (DATE)
    new Date(
      item.trdt.substring(0, 4),
      item.trdt.substring(4, 6) - 1,
      item.trdt.substring(6, 8),
      item.trdt.substring(8, 10),
      item.trdt.substring(10, 12),
      item.trdt.substring(12, 14)
    ), // trdt (DATETIME)
    new Date(
      item.regDT.substring(0, 4),
      item.regDT.substring(4, 6) - 1,
      item.regDT.substring(6, 8),
      item.regDT.substring(8, 10),
      item.regDT.substring(10, 12),
      item.regDT.substring(12, 14)
    ), // regDT (DATETIME)
  ]);

  // 2. Bulk Insert와 Upsert를 결합한 SQL 쿼리
  const query = `
        INSERT INTO bank_transactions (
            tid, trserial, accountID, balance, accIn, accOut, 
            remark1, remark2, remark3, remark4, memo, 
            trdate, trdt, regDT
        ) VALUES ?
        -- 중복 시 업데이트 (tid와 trserial 조합을 고유 키로 가정)
        ON DUPLICATE KEY UPDATE
            balance = VALUES(balance),
            accIn = VALUES(accIn),
            accOut = VALUES(accOut),
            regDT = VALUES(regDT);
    `;

  try {
    // 3. 쿼리 실행: 2차원 배열을 [valuesForBulkInsert] 형태로 래핑하여 전달
    // const [result] = await pool.query(sql, [valuesForBulkInsert]);
    const result = await sql.executeQuery(query, [valuesForBulkInsert]);
    return result;
  } catch (error) {
    console.error("은행 거래 내역 Bulk Insert 오류:", error);
    throw new Error("DB 저장 중 오류가 발생했습니다.");
  }
};

// const saveTransactions = async (transactions) => {
//     const checkquery = `select * from Customers where customerName='${customer.customerName}' and dealYN='Y'`
//     const checkresult = await sql.executeQuery(checkquery)
//     console.log('addCustomer=', checkresult.length)
//     customer.inboundDate=dayjs(customer.inboundDate).format('YYYY-MM-DD')
//     if (checkresult.length === 0) {
//         const query = 'INSERT INTO Customers (customerName, contactPerson, position, phone, email, leadSource, inboundDate, businessNumber, representative, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
//         const params = [
//             customer.customerName,
//             customer.contactPerson,
//             customer.position,
//             customer.phone,
//             customer.email,
//             customer.leadSource,
//             customer.inboundDate,
//             customer.businessNumber,
//             customer.representative,
//             customer.location,
//             customer.notes
//         ];
//         const result = await sql.executeQuery(query, params);
//         return { msg:'고객 추가 완료',id: result.insertId, ...customer };
//     } else {
//         return {msg:'동일 거래처명이 존재합니다'}
//     }

// };

const search = async (startDate, endDate) => {
  const JobID = await getJobID(startDate, endDate);
  return new Promise((resolve, reject) => {
    easyFinBankService.search(
      process.env.POPBILL_CORP_NUM /* CorpNum */,
      JobID /* JobID */,
      "I" /* TradeType (I: 입금, O: 출금, A: 전체) */,
      "" /* SearchString (검색 키워드) */,
      1 /* Page */,
      1000 /* PerPage */,
      "A" /* Order (A: 오름차순, D: 내림차순) */,
      process.env.POPBILL_USER_ID /* UserID */,
      function (jobID) {
        saveTransactions(jobID.list);
        // resolve({ success: true, jobID: jobID });
      },
      function (Error) {
        console.log("오류 코드 :" + Error.code);
      }
    );
  });
};

const getJobID = async (startDate, endDate) => {
  // 변수 선언을 최소화하고, 환경 변수와 인자를 직접 사용
  const bankCode = "0003";
  return new Promise((resolve, reject) => {
    easyFinBankService.requestJob(
      process.env.POPBILL_CORP_NUM,
      bankCode,
      process.env.POPBILL_BANK_ACCOUNT,
      startDate,
      endDate,
      // 성공 콜백
      function (jobID) {
        resolve(jobID);
      },
      // 오류 콜백
      function (Error) {
        // 오류 메시지를 콘솔에 출력하고, Promise를 reject하여 외부 async/await 체인에 오류 전달
        console.error("팝빌 Job 요청 오류:", Error.message);
        reject(Error);
      }
    );
  });
};

export default {
  search,
};
