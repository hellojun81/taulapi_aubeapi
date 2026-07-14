import * as popbillBank from "../../services/popbill/popbillBank.js";
import * as popbillKakao from "../../services/popbill/popbillKakao.js";
import * as popbillBiz from "../../services/popbill/popbillBiz.js";
import * as popbillTax from "../../services/popbill/popbillTax.js";
// const kakaoSend = async (req, res, next) => {
//   popbillKakao.kakaoSend(req, res, next);
// };

export const MessageSend = popbillKakao.MessageSend;
export const Templatelist = popbillKakao.Templatelist;
export const TemplateContent = popbillKakao.TemplateContent;
export const getSendMessages = popbillKakao.getSendMessages;
export const SendMessageHistory = popbillKakao.SendMessageHistory;
export const SendMessageHistoryCount = popbillKakao.SendMessageHistoryCount;

export const checkBizInfo = popbillBiz.checkBizInfo;

export const registTaxIssue = popbillTax.registTaxIssue;
export const latestTransactions = popbillBank.latestTransactions;
export const singleMemoUpdate = popbillBank.singleMemoUpdate;

export const listBankAccounts = async (req, res) => {
  try {
    const accounts = await popbillBank.listBankAccounts();
    res.json(
      accounts.map((account) => ({
        bankCode: account.bankCode,
        accountName: account.accountName,
        maskedAccountNumber: `****${String(account.accountNumber).slice(-4)}`,
        state: account.state,
        contractState: account.contractState,
        useEndDate: account.useEndDate,
      }))
    );
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

export const getBankAccountOptions = async (req, res) => {
  try {
    res.json(await popbillBank.getBankAccountOptions());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const get_DB_BankTransactions = async (req, res) => {
  try {
    const { startDate, endDate, tradeType, description, accountID } = req.query;
    const result = await popbillBank.get_DB_BankTransactions(startDate, endDate, tradeType, description, accountID);
    // console.log(result);
    res.json(result);
  } catch (error) {
    console.error("latestTransactions 처리 중 오류:", error.message);
    res.status(500).json({
      message: "거래 내역 조회 및 저장에 실패했습니다.",
      error: error.message,
    });
  }
};

export const BulkUpdateMemo = async (req, res) => {
  const result = await popbillBank.BulkupdateTransaction(req, res);
  res.json(result);
};

export const updateMoneyfinish = async (req, res) => {
  try {
    const result = await popbillBank.updateMoneyfinish(req, res);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "입금 완료 처리 중 서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
};
