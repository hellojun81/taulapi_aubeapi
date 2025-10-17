// // controllers/customersController.js
// import bankService from "../../services/crm/bankService.js";

// const getBankTransactions = async (req, res) => {
//   try {
//     const { start, end, keyword, onlyDeposit } = req.query;
//     const customers = await bankService.getBankTransactions(
//       start,
//       end,
//       keyword,
//       onlyDeposit
//     );
//     console.log("getBankTransactions keyword", req.keyword);
//     res.json(customers);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// export default { getBankTransactions };
