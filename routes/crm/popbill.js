// routes/crm/popbill.js (ESM)
import express from "express";
import popbillController from "../../controllers/popbill/popbillController.js";

const router = express.Router();
router.get("/:id", popbillController.getsearch);

export default router;
