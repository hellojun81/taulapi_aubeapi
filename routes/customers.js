// routes/customers.js
import express from 'express';
import customersController from '../controllers/customersController.js';

const router = express.Router();

//추가
router.post('/', customersController.addCustomer);
//검색
router.get('/', customersController.getCustomers);
//ID값검색
router.get('/:id', customersController.getCustomerById);
//수정
router.put('/:id', customersController.updateCustomer);
//삭제
router.delete('/:id', customersController.deleteCustomer);

export default router;
