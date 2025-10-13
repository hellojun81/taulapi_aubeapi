import popbillBank from "../../services/popbill/popbillBank.js";

const getsearch = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await popbillBank.search(startDate, endDate);
    console.log("result", result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  getsearch,
};
