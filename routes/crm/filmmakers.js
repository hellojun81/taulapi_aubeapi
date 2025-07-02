 import express from 'express';
 import filmmakersContoller from '../../controllers/crm/filmmakers.js';

const router = express.Router();


router.post('/', filmmakersContoller.getLogin);
router.get('/', filmmakersContoller.getInfo);
router.post('/:id', filmmakersContoller.postEdit);
// router.get('/:id', filmmakersContoller.postEdit);
// router.put('/', filmmakersContoller.postEditThumbnail);

export default router;