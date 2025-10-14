import popbill from "popbill";
import express from "express";
import sql from "../../lib/crm/sql.js";
/**
 * 은행 거래 내역을 검색 조건에 따라 MySQL에서 조회합니다.
 * @param {string|null} accountIDToSearch - null이면 전체 계좌, string이면 특정 계좌 ID
 * @param {string} startDate - YYYYMMDD 형식의 시작일
 * @param {string} endDate - YYYYMMDD 형식의 종료일
 * @param {string} tradeType - 0:전체, 1:입금, 2:출금 (문자열로 전달됨)
 */
const router = express.Router();
// const pool = require("../db/db"); // MySQL 연결 모듈 경로에 맞게 수정 필요
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

const latestTransactions = async (startDate, endDate) => {
  const JobID = await getJobID(startDate, endDate);
  return new Promise((resolve, reject) => {
    easyFinBankService.search(
      process.env.POPBILL_CORP_NUM /* CorpNum */,
      JobID /* JobID */,
      "A" /* TradeType (I: 입금, O: 출금, A: 전체) */,
      "" /* SearchString (검색 키워드) */,
      1 /* Page */,
      1000 /* PerPage */,
      "A" /* Order (A: 오름차순, D: 내림차순) */,
      process.env.POPBILL_USER_ID /* UserID */,
      function (jobID) {
        const result = saveTransactions(jobID.list);
        resolve(result);
      },
      function (Error) {
        resolve("오류 코드 :" + Error.code);
      }
    );
  });
};
export const saveTransactions = async (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { message: "저장할 거래 내역이 없습니다.", affectedRows: 0 };
  }
  // console.log("transactions", transactions);
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

const getTradeTypeFilter = (num) => {
  switch (num) {
    case 1:
      return "accIn > 0"; // 입금일 경우 accIn 필드가 0보다 큼
    case 2:
      return "accOut > 0"; // 출금일 경우 accOut 필드가 0보다 큼
    default:
      return null; // 전체 (필터 조건 없음)
  }
};

const get_DB_BankTransactions = async (
  startDate,
  endDate,
  tradeType,
  description
) => {
  let whereClauses = [];
  let queryParams = [];
  // 2-1. 날짜 필터 (프론트에서 YYYYMMDD 형태로 넘어온다고 가정)
  if (startDate && endDate) {
    // DB의 trdate 컬럼이 DATE 타입이라고 가정하고, STR_TO_DATE로 비교합니다.
    whereClauses.push("trdate >= STR_TO_DATE(?, '%Y%m%d')");
    queryParams.push(startDate);
    whereClauses.push("trdate <= STR_TO_DATE(?, '%Y%m%d')");
    queryParams.push(endDate);
  }
  // 2-2. 거래 유형 필터 (입금/출금)
  const tradeCondition = getTradeTypeFilter(parseInt(tradeType, 10));
  if (tradeCondition) {
    whereClauses.push(tradeCondition);
  }
  if (description) {
    const likeCondition = `
            (
                remark1 LIKE CONCAT('%', ?, '%') OR 
                remark2 LIKE CONCAT('%', ?, '%') OR 
                remark3 LIKE CONCAT('%', ?, '%') OR 
                remark4 LIKE CONCAT('%', ?, '%')
            )
        `;
    whereClauses.push(likeCondition);

    // 🚨 LIKE 조건마다 동일한 검색어를 4번 푸시해야 합니다.
    queryParams.push(description);
    queryParams.push(description);
    queryParams.push(description);
    queryParams.push(description);
  }
  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  // 3. 최종 SQL 쿼리
  const query = `
        SELECT 
            tid, trserial, accountID, balance, accIn, accOut, 
            replace(replace(CONCAT_WS(' / ', remark1, remark2, remark3, remark4),'타행이체',''),' /  / ','') AS combined_remark,
            memo, 
            trdate, trdt, regDT, IFNULL(pay_type,'') as pay_type, memo
        FROM bank_transactions 
        ${whereSql}
        ORDER BY trdate DESC, trdt DESC;
    `;
  try {
    const rows = await sql.executeQuery(query, queryParams);
    return rows;
  } catch (error) {
    console.error("DB에서 은행 거래 내역 DB 조회 오류:", error);
    return { message: "DB에서 은행 거래 내역을 조회하지 못했습니다." };
  }
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
        resolve("팝빌 Job 요청 오류:", Error.message);
        reject(Error);
      }
    );
  });
};

const updateTransaction = async (req, res) => {
  // 1. 키 값 추출 (URL 파라미터)
  const { tid, trserial } = req.params;
  const { pay_type, memo } = req.body;
  const query = `
        UPDATE bank_transactions
        SET 
            pay_type = ?,
            memo = ?,
            regDT = NOW() -- 🚨 수정된 시간 기록
        WHERE 
            tid = ? AND trserial = ?;
    `;
  const queryParams = [pay_type, memo, tid, trserial];

  try {
    // 4. 쿼리 실행
    const result = await sql.executeQuery(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message:
          "해당 TID/TRSerial의 거래를 찾을 수 없거나 변경 사항이 없습니다.",
      });
    }

    // 5. 성공 응답
    res.json({
      message: "거래 분류 및 메모가 성공적으로 업데이트되었습니다.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("DB 업데이트 오류:", error);
    res
      .status(500)
      .json({ message: "거래 업데이트에 실패했습니다.", error: error.message });
  }
};

const BulkupdateTransaction = async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    // 1. 유효성 검사 및 응답 후 return
    return res
      .status(400)
      .json({ message: "유효한 업데이트 데이터가 제공되지 않았습니다." });
  }
  try {
    let updatedCount = 0;
    for (const item of updates) {
      // 키 유효성 검사 (tid, trserial은 Null이 아니어야 함)
      if (!item.tid || !item.trserial) continue;
      const query = `
        UPDATE bank_transactions
        SET 
          pay_type = ?,
          memo = ?,
          regDT = NOW()
        WHERE 
          tid = ? AND trserial = ?;
      `;
      const queryParams = [item.pay_type, item.memo, item.tid, item.trserial];
      const result = await sql.executeQuery(query, queryParams);
      // 업데이트된 행의 수 누적
      updatedCount += result.affectedRows;
    }

    // 5. 성공 응답 후 반드시 return을 사용하여 함수 실행 종료
    return {
      message: "일괄 업데이트가 성공적으로 완료되었습니다.",
      updatedCount: updatedCount,
    };
  } catch (error) {
    // 7. 오류 응답 후 반드시 return을 사용하여 함수 실행 종료 -> 'Headers Sent' 오류 해결
    return {
      message: "일괄 업데이트 중 오류가 발생하였습니다.",
      error: error.message,
    };
  }
};

const updateMoneyfinish = async (req, res) => {
  const { id, isFinish } = req.body;
  try {
    const query = `
        UPDATE schedules
        SET 
          MoneyfinishNY = ?,
          updated_at = NOW()
        WHERE 
          id = ?;
      `;
    const queryParams = [isFinish, id];
    // console.log({ query: query, queryParams: queryParams });
    const result = await sql.executeQuery(query, queryParams);
    console.log(result);
    return {
      message: "입금완료 처리를 성공적으로 완료되었습니다.",
    };
  } catch (error) {
    return {
      message: "입금완료 처리를 중 오류가 발생하였습니다.",
      error: error.message,
    };
  }
};

export default {
  latestTransactions,
  get_DB_BankTransactions,
  updateTransaction,
  BulkupdateTransaction,
  updateMoneyfinish,
};
