// import popbill from "popbill";
import dayjs from "dayjs";
import sql from "../../lib/crm/sql.js";

import { createSuccessCallback, createErrorCallback, easyFinBankService, CorpNum, UserID, BANK_ACCOUNT } from "../../util/popbillConfig.js";

export const listBankAccounts = async () =>
  new Promise((resolve, reject) => {
    easyFinBankService.listBankAccount(
      CorpNum,
      UserID,
      (accounts) => resolve(accounts || []),
      (error) => reject(new Error(error?.message || "등록 계좌 목록 조회 실패"))
    );
  });

const searchAccountTransactions = async (account, startDate, endDate) => {
  const jobID = await getJobID(startDate, endDate, account.bankCode, account.accountNumber);
  await waitForJobCompletion(jobID);
  const searchResult = await new Promise((resolve, reject) => {
    easyFinBankService.search(
      CorpNum,
      jobID,
      "A",
      "",
      1,
      1000,
      "A",
      UserID,
      resolve,
      (error) => reject(new Error(error?.message || "거래내역 조회 중 오류 발생"))
    );
  });
  await saveAccountRegistry(searchResult.list, account);
  const saved = await saveTransactions(searchResult.list);
  return {
    accountName: account.accountName || "계좌",
    accountNumber: `****${String(account.accountNumber).slice(-4)}`,
    collectedCount: Number(searchResult?.totalCount || searchResult?.TotalCount || 0),
    updatedCount: Number(saved?.affectedRows || 0),
  };
};

const ensureBankAccountRegistry = async () => {
  await sql.executeQuery(`
    CREATE TABLE IF NOT EXISTS bank_account_registry (
      accountID VARCHAR(64) PRIMARY KEY,
      accountName VARCHAR(100) NOT NULL,
      bankCode VARCHAR(10),
      maskedAccountNumber VARCHAR(20),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const saveAccountRegistry = async (transactions = [], account) => {
  const accountIDs = [...new Set(transactions.map((item) => item.accountID).filter(Boolean))];
  if (!accountIDs.length) return;
  await ensureBankAccountRegistry();

  for (const accountID of accountIDs) {
    await sql.executeQuery(
      `INSERT INTO bank_account_registry (accountID, accountName, bankCode, maskedAccountNumber)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         accountName = VALUES(accountName),
         bankCode = VALUES(bankCode),
         maskedAccountNumber = VALUES(maskedAccountNumber)`,
      [accountID, account.accountName || "계좌", account.bankCode, `****${String(account.accountNumber).slice(-4)}`]
    );
  }
};

const getJobState = async (jobID) =>
  new Promise((resolve, reject) => {
    easyFinBankService.getJobState(
      CorpNum,
      jobID,
      UserID,
      resolve,
      (error) => reject(new Error(error?.message || "수집 상태 확인 실패"))
    );
  });

const waitForJobCompletion = async (jobID, maxAttempts = 30, intervalMs = 1000) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const state = await getJobState(jobID);
    if (String(state.jobState) === "3") {
      if (Number(state.errorCode) === 1) return state;
      throw new Error(state.errorReason || "계좌 거래내역 수집에 실패했습니다.");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("계좌 거래내역 수집 대기 시간이 초과되었습니다.");
};

const collectAllBankAccounts = async (startDate, endDate) => {
  let accounts = await listBankAccounts();
  if (!accounts.length && BANK_ACCOUNT) {
    accounts = [{ bankCode: "0003", accountNumber: BANK_ACCOUNT, accountName: "기본계좌" }];
  }

  return Promise.all(
    accounts.map(async (account) => {
      try {
        return { ok: true, ...(await searchAccountTransactions(account, startDate, endDate)) };
      } catch (error) {
        return {
          ok: false,
          accountName: account.accountName || "계좌",
          accountNumber: `****${String(account.accountNumber).slice(-4)}`,
          message: error.message,
        };
      }
    })
  );
};

export const latestTransactions = async (req, res) => {
  const startDate = dayjs().subtract(27, "day").format("YYYYMMDD");
  const endDate = dayjs().format("YYYYMMDD");
  try {
    const accounts = await collectAllBankAccounts(startDate, endDate);
    const updatedCount = accounts.reduce((sum, account) => sum + (account.updatedCount || 0), 0);
    const hasSuccess = accounts.some((account) => account.ok);
    return res.status(hasSuccess ? 200 : 502).json({ updatedCount, accounts });
  } catch (error) {
    return res.status(502).json({ message: error.message });
  }
};

export const AutolatestTransactions = async () => {
  const startDate = dayjs().subtract(30, "day").format("YYYYMMDD");
  const endDate = dayjs().format("YYYYMMDD");
  try {
    const accounts = await collectAllBankAccounts(startDate, endDate);
    const successCount = accounts.filter((account) => account.ok).length;
    const updatedCount = accounts.reduce((sum, account) => sum + (account.updatedCount || 0), 0);
    console.log(`✅ ${successCount}/${accounts.length}개 계좌, ${updatedCount}건 업데이트 완료.`);
    return { accounts, updatedCount };
  } catch (error) {
    console.error(`🚨 latestTransactions 처리 중 오류: ${error.message}`);
    return { accounts: [], updatedCount: 0, error: error.message };
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

export const get_DB_BankTransactions = async (startDate, endDate, tradeType, description, accountID) => {
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
  if (accountID) {
    const accountIDs = String(accountID).split(",").filter(Boolean);
    whereClauses.push(`accountID IN (${accountIDs.map(() => "?").join(",")})`);
    queryParams.push(...accountIDs);
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

export const getBankAccountOptions = async () => {
  await ensureBankAccountRegistry();
  const rows = await sql.executeQuery(`
    SELECT DISTINCT T.accountID, R.accountName
    FROM bank_transactions T
    LEFT JOIN bank_account_registry R ON R.accountID = T.accountID
    WHERE T.accountID IS NOT NULL AND T.accountID <> ''
    ORDER BY T.accountID
  `);
  const legacyLabels = ["지출용계좌", "매출용계좌"];
  const grouped = new Map();

  rows.forEach((row, index) => {
    const hasAccountName = row.accountName && !["undefined", "null"].includes(row.accountName);
    const accountName = hasAccountName ? row.accountName : legacyLabels[index] || `계좌 ${index + 1}`;
    const group = grouped.get(accountName) || { label: accountName, accountIDs: [] };
    group.accountIDs.push(row.accountID);
    grouped.set(accountName, group);
  });

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    value: group.accountIDs.join(","),
  }));
};

const getJobID = async (startDate, endDate, bankCode = "0003", accountNumber = BANK_ACCOUNT) => {
  return new Promise((resolve, reject) => {
    easyFinBankService.requestJob(
      CorpNum,
      bankCode,
      accountNumber,
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
