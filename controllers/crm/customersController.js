// controllers/customersController.js
import customersService from "../../services/crm/customersService.js";

const addCustomer = async (req, res) => {
  try {
    const customer = req.body;
    const result = await customersService.addCustomer(customer);
    res.status(201).json({ message: result.msg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await customersService.getCustomers();
    // console.log('getCustomers',req)
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { customerName } = req.query;
    // console.log("getCustomerById", req.params);
    const customer = await customersService.getCustomerById(customerName);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = req.body;
    console.log(updateCustomer,{ id: id, customer: customer });
    await customersService.updateCustomer(id, customer);
    res.status(200).json({ message: "수정 완료" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await customersService.deleteCustomer(id);
    res.status(200).json({ message: "삭제 완료" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  addCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
