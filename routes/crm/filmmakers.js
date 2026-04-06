 import express from 'express';
 import filmmakersContoller from '../../controllers/crm/filmmakers.js';

const router = express.Router();
//필름메이커스 테스트시 POST http://localhost:8001/api/filmmakers/21206554 값으로 패킷날려서 테스트

router.post('/', filmmakersContoller.getLogin);
router.get('/', filmmakersContoller.getInfo);
router.post('/:id', filmmakersContoller.postEdit);
// router.get('/:id', filmmakersContoller.postEdit);
// router.put('/', filmmakersContoller.postEditThumbnail);

export default router;