import popbillBank from "../../services/popbill/popbillBank.js";

const getsearch = async (req, res) => {
  try {
    const accountID = req.params.id;
    const { startDate, endDate, tradeType, description } = req.query;
    let result;
    switch (accountID) {
      case "get_DB_BankTransactions":
        // console.log({
        //   accountID: accountID,
        //   startDate: startDate,
        //   description: description,
        // });
        result = await popbillBank.get_DB_BankTransactions(
          startDate,
          endDate,
          tradeType,
          description
        );
        break;

      case "latestTransactions":
        result = await popbillBank.latestTransactions(startDate, endDate);
        break;

      default:
        // 특정 계좌 ID가 전달된 경우, 그 값을 그대로 사용
        // accountIDToSearch = rawAccountID;
        break;
    }

    // console.log("result", result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error2: error.message });
  }
};

const UpdateMemo = async (req, res) => {
  const { pay_type } = req.query;
  const result = popbillBank.updateTransaction(req, res);
  res.json(result);
};
const BulkUpdateMemo = async (req, res) => {
  // console.log("BulkUpdateMemo");
  const result = await popbillBank.BulkupdateTransaction(req, res);
  res.json(result);
};
const updateMoneyfinish = async (req, res) => {
  // console.log("updateMoneyfinish");
  const result = await popbillBank.updateMoneyfinish(req, res);
  res.json(result);
};
export default {
  getsearch,
  UpdateMemo,
  BulkUpdateMemo,
  updateMoneyfinish,
};
