 import express from 'express';
 import filmmakersContoller from '../controllers/filmmakers.js';

const router = express.Router();


router.post('/', filmmakersContoller.getLogin);
router.get('/', filmmakersContoller.getInfo);
router.post('/:id', filmmakersContoller.postEdit);


export default router;