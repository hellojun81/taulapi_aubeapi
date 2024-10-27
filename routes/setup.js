// routes/schedules.js
import express from 'express';
import setupController from '../controllers/setupController.js';

const router = express.Router();


// // GET 요청: 모든 스케줄 데이터 가져오기
router.get('/', setupController.getAllsetup);

// GET 요청: 특정 스케줄 데이터 가져오기
router.get('/:id', setupController.getSetupID);

// // POST 요청: 새로운 스케줄 추가
// router.post('/', setupController.createSchedule);

// // GET 요청: 특정 스케줄 데이터 가져오기
// router.get('/:id', setupController.getScheduleById);

// // PUT 요청: 특정 스케줄 수정
// router.put('/:id', setupController.updateSchedule);

// // DELETE 요청: 특정 스케줄 삭제
// router.delete('/:id', setupController.deleteSchedule);

export default router;