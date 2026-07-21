import estimatesService from "../../services/crm/estimatesService.js";

const validateKey = (value) => {
  const key = String(value || "").trim();
  if (!key || key.length > 191) {
    throw new Error("유효하지 않은 견적서 문서 키입니다.");
  }
  return key;
};

const getEstimate = async (req, res) => {
  try {
    const documentKey = validateKey(req.params.documentKey);
    const result = await estimatesService.getEstimate(documentKey);
    res.json(result || { document: null });
  } catch (error) {
    console.error("견적서 조회 실패:", error);
    res.status(500).json({ error: error.message || "견적서 조회에 실패했습니다." });
  }
};

const saveEstimate = async (req, res) => {
  try {
    const documentKey = validateKey(req.params.documentKey);
    const document = req.body?.document;
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return res.status(400).json({ error: "저장할 견적서 내용이 필요합니다." });
    }

    const size = Buffer.byteLength(JSON.stringify(document), "utf8");
    if (size > 500_000) {
      return res.status(413).json({ error: "견적서 데이터가 너무 큽니다." });
    }

    const result = await estimatesService.saveEstimate(documentKey, document);
    res.json({ message: "견적서가 저장되었습니다.", ...result });
  } catch (error) {
    console.error("견적서 저장 실패:", error);
    res.status(500).json({ error: error.message || "견적서 저장에 실패했습니다." });
  }
};

const listEstimates = async (req, res) => {
  try {
    const { search = "", startDate = "", endDate = "" } = req.query;
    const result = await estimatesService.listEstimates({ search, startDate, endDate });
    res.json(result);
  } catch (error) {
    console.error("견적서 목록 조회 실패:", error);
    res.status(500).json({ error: error.message || "견적서 목록 조회에 실패했습니다." });
  }
};

const deleteEstimate = async (req, res) => {
  try {
    const documentKey = validateKey(req.params.documentKey);
    const deleted = await estimatesService.deleteEstimate(documentKey);
    if (!deleted) {
      return res.status(404).json({ error: "삭제할 견적서를 찾을 수 없습니다." });
    }
    res.json({ message: "견적서가 삭제되었습니다." });
  } catch (error) {
    console.error("견적서 삭제 실패:", error);
    res.status(500).json({ error: error.message || "견적서 삭제에 실패했습니다." });
  }
};

export default {
  getEstimate,
  saveEstimate,
  listEstimates,
  deleteEstimate,
};
