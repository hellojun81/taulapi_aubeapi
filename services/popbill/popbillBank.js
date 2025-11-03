import popbill from "popbill";
import dayjs from "dayjs";
import sql from "../../lib/crm/sql.js";

import { createSuccessCallback, createErrorCallback, easyFinBankService, CorpNum, UserID, BANK_ACCOUNT } from "../../util/popbillConfig.js";

export const latestTransactions = async (req, res) => {
  let JobID;
  const startDate = dayjs().subtract(30, "day").format("YYYYMMDD");
  const endDate = dayjs().format("YYYYMMDD");
  try {
    JobID = await getJobID(startDate, endDate);
  } catch (error) {
    throw new Error("은행 계좌 거래 내역 요청 JobID 발급 실패: " + error.message);
  }
  const searchResult = await new Promise((resolve, reject) => {
    easyFinBankService.search(
      CorpNum,
      JobID,
      "A",
      "",
      1,
      1000,
      "A",
      UserID,
      (result) => {
        resolve(result);
      },
       (error) => {
        const msg =
          (error && error.message) ||
          (typeof error === "string" ? error : "") ||
          "거래내역 조회 중 오류 발생";
        reject(new Error(msg));
      }
    );
  });
  const saveData = await saveTransactions(searchResult.list);
  res.json(`${saveData.affectedRows}건 업데이트 완료`);
};

export const AutolatestTransactions = async () => {
  let JobID;
  const startDate = dayjs().subtract(30, "day").format("YYYYMMDD");
  const endDate = dayjs().format("YYYYMMDD");
  try {
    JobID = await getJobID(startDate, endDate);
    const searchResult = await new Promise((resolve, reject) => {
      // 팝빌 SDK가 success/error 콜백을 분리하여 받는다고 가정하고 처리
      easyFinBankService.search(
        CorpNum,
        JobID,
        "A",
        "",
        1,
        1000,
        "A",
        UserID,
        (result) => {
          resolve(result);
        },

        (error) => {
          reject(new Error(error.message || "거래내역 조회 중 오류 발생"));
        }
      );
    });
    const saveData = await saveTransactions(searchResult.list);
    const totalCount = searchResult && searchResult.TotalCount ? searchResult.TotalCount : 0;
    console.log(`✅ 은행거래내역 조회 및 업데이트 완료. 총 ${totalCount}건 조회됨.`);
  } catch (error) {
    if (error.message.includes("JobID 발급 실패")) {
      console.error(`🚨 FATAL 오류: ${error.message}`);
    } else {
      console.error(`🚨 latestTransactions 처리 중 오류: ${error.message}`);
    }
  }
};

export const saveTransactions = async (transactions) => {
  if (!transactions || transactions.length === 0) {
    return { message: "저장할 거래 내역이 없습니다.", affectedRows: 0 };
  }
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
    new Date(item.trdate.substring(0, 4), item.trdate.substring(4, 6) - 1, item.trdate.substring(6, 8)),
    new Date(
      item.trdt.substring(0, 4),
      item.trdt.substring(4, 6) - 1,
      item.trdt.substring(6, 8),
      item.trdt.substring(8, 10),
      item.trdt.substring(10, 12),
      item.trdt.substring(12, 14)
    ),
    new Date(
      item.regDT.substring(0, 4),
      item.regDT.substring(4, 6) - 1,
      item.regDT.substring(6, 8),
      item.regDT.substring(8, 10),
      item.regDT.substring(10, 12),
      item.regDT.substring(12, 14)
    ),
  ]);

  const query = `
        INSERT INTO bank_transactions (
            tid, trserial, accountID, balance, accIn, accOut, 
            remark1, remark2, remark3, remark4, memo, 
            trdate, trdt, regDT
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
            balance = VALUES(balance),
            accIn = VALUES(accIn),
            accOut = VALUES(accOut),
            regDT = VALUES(regDT);
    `;
  try {
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
      return "accIn > 0";
    case 2:
      return "accOut > 0";
    default:
      return null;
  }
};

export const get_DB_BankTransactions = async (startDate, endDate, tradeType, description) => {
  let whereClauses = [];
  let queryParams = [];
  if (startDate && endDate) {
    whereClauses.push("trdate >= STR_TO_DATE(?, '%Y%m%d')");
    queryParams.push(startDate);
    whereClauses.push("trdate <= STR_TO_DATE(?, '%Y%m%d')");
    queryParams.push(endDate);
  }
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
                remark4 LIKE CONCAT('%', ?, '%') OR
                memo LIKE CONCAT('%', ?, '%') 
            )
        `;
    whereClauses.push(likeCondition);
    queryParams.push(description);
    queryParams.push(description);
    queryParams.push(description);
    queryParams.push(description);
    queryParams.push(description);
  }
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
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
  const BankCode = "0003";
  return new Promise((resolve, reject) => {
    easyFinBankService.requestJob(
      CorpNum,
      BankCode,
      BANK_ACCOUNT,
      startDate,
      endDate,
      function (jobID) {
        resolve(jobID);
      },
      function (Error) {
        reject(Error);
      }
    );
  });
};

export const updateTransaction = async (req, res) => {
  const { tid, trserial } = req.params;
  const { pay_type, memo } = req.body;
  const query = `
        UPDATE bank_transactions
        SET 
            pay_type = ?,
            memo = ?,
            regDT = NOW()
        WHERE 
            tid = ? AND trserial = ?;
    `;
  const queryParams = [pay_type, memo, tid, trserial];

  try {
    const result = await sql.executeQuery(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "해당 TID/TRSerial의 거래를 찾을 수 없거나 변경 사항이 없습니다.",
      });
    }

    res.json({
      message: "거래 분류 및 메모가 성공적으로 업데이트되었습니다.",
      affectedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("DB 업데이트 오류:", error);
    res.status(500).json({ message: "거래 업데이트에 실패했습니다.", error: error.message });
  }
};

export const BulkupdateTransaction = async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: "유효한 업데이트 데이터가 제공되지 않았습니다." });
  }
  try {
    let updatedCount = 0;
    for (const item of updates) {
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
      updatedCount += result.affectedRows;
    }

    return {
      message: "일괄 업데이트가 성공적으로 완료되었습니다.",
      updatedCount: updatedCount,
    };
  } catch (error) {
    return {
      message: "일괄 업데이트 중 오류가 발생하였습니다.",
      error: error.message,
    };
  }
};

export const updateMoneyfinish = async (req, res) => {
  const { id, isFinish } = req.body;
  console.log("isFinish", isFinish);
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
    const result = await sql.executeQuery(query, queryParams);
    let message;
    const status = Number(isFinish);
    if (status === 1) {
      message = "입금완료 처리가 성공적으로 반영되었습니다.";
    } else if (status === 0) {
      message = "입금완료 취소 처리로 상태가 변경되었습니다.";
    } else {
      message = "입금 상태 업데이트를 완료했습니다.";
    }
    return {
      message: message,
    };
  } catch (error) {
    return {
      message: "입금완료 처리를 중 오류가 발생하였습니다.",
      error: error.message,
    };
  }
};

export const singleMemoUpdate = async (req, res) => {
  const { tid, trserial } = req.params;
  const { pay_type, memo } = req.body;
  try {
    console.log({ pay_type: pay_type, memo: memo, tid: tid });
    if (!tid || !trserial) {
      return res.status(400).json({ message: "TID 또는 거래번호(trserial)가 누락되었습니다." });
    }
    const query = `
      UPDATE bank_transactions
      SET pay_type = ?, memo = ?, regDT = NOW()
      WHERE tid = ? AND trserial = ?
    `;
    const result = await sql.executeQuery(query, [pay_type, memo, tid, trserial]);
    res.json({ message: "거래 정보가 성공적으로 업데이트되었습니다." });
  } catch (error) {
    console.error("❌ DB 업데이트 오류:", error);
    res.status(500).json({ message: "서버 오류로 거래 정보를 업데이트하지 못했습니다." });
  }
};
