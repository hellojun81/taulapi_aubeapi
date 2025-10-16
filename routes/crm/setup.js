// routes/schedules.js
import express from "express";
import setupController from "../../controllers/crm/setupController.js";

const router = express.Router();

// // GET 요청: 모든 스케줄 데이터 가져오기
router.get("/", setupController.getAllsetup);

// GET 요청: 특정 스케줄 데이터 가져오기
router.get("/:id", setupController.getSetupID);

export default router;
