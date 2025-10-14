// routes/crm/popbill.js (ESM)
import express from "express";
import popbillController from "../../controllers/popbill/popbillController.js";

const router = express.Router();
router.get("/:id", popbillController.getsearch);
// router.put("/:tid/:trserial", popbillController.UpdateMemo);
router.post("/transactions/bulkUpdate", popbillController.BulkUpdateMemo);
router.put("/updateMoneyfinish", popbillController.updateMoneyfinish);

export default router;
