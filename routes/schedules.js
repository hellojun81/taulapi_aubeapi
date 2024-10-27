// routes/schedules.js
import express from 'express';
import schedulesController from '../controllers/schedulesController.js';

const router = express.Router();

// GET 요청: 모든 스케줄 데이터 가져오기
router.get('/', schedulesController.getAllSchedules);

// POST 요청: 새로운 스케줄 추가
router.post('/', schedulesController.createSchedule);

// GET 요청: 특정 스케줄 데이터 가져오기
router.get('/:id', schedulesController.getScheduleById);

// PUT 요청: 특정 스케줄 수정
router.put('/:id', schedulesController.updateSchedule);

// DELETE 요청: 특정 스케줄 삭제
router.delete('/:id', schedulesController.deleteSchedule);

export default router;