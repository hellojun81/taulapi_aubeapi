import express from "express";
import estimatesController from "../../controllers/crm/estimatesController.js";

const router = express.Router();

router.get("/", estimatesController.listEstimates);
router.get("/:documentKey", estimatesController.getEstimate);
router.put("/:documentKey", estimatesController.saveEstimate);
router.delete("/:documentKey", estimatesController.deleteEstimate);

export default router;
