// routes/crm/popbill.js (ESM)
import express from "express";
import * as popbillController from "../../controllers/popbill/popbillController.js";

const router = express.Router();

router.get("/kakao/Templatelist", popbillController.Templatelist);
router.get("/kakao/TemplateContent", popbillController.TemplateContent);
router.post("/kakao/MessageSend", popbillController.MessageSend);
router.get("/kakao/getSendMessages", popbillController.getSendMessages);
router.get("/kakao/SendMessages", popbillController.getSendMessages);
router.get("/kakao/SendMessageHistory", popbillController.SendMessageHistory);
router.get("/kakao/SendMessageHistoryCount", popbillController.SendMessageHistoryCount);

router.get("/biz/checkBizInfo", popbillController.checkBizInfo);

router.post("/tax/registTaxIssue", popbillController.registTaxIssue);

router.get("/bank/latestTransactions", popbillController.latestTransactions);
router.get("/bank/get_DB_BankTransactions", popbillController.get_DB_BankTransactions);
router.put("/bank/updateMoneyfinish", popbillController.updateMoneyfinish);
router.post("/bank/bulkUpdate", popbillController.BulkUpdateMemo);
// router.post("/bank/SingleUpdate", popbillController.SingleUpdate);
router.put("/bank/:tid/:trserial", popbillController.singleMemoUpdate);

export default router;
