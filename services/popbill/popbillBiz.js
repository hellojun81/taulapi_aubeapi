import { createSuccessCallback, createErrorCallback, bizInfoCheckService, CorpNum, UserID } from "../../util/popbillConfig.js";

export const checkBizInfo = async (req, res) => {
  const successCallback = createSuccessCallback(req, res, "사업자 정보 조회 성공");
  const errorCallback = createErrorCallback(req, res, "사업자 정보 조회 실패");
  const { checkCorpNum } = req.query;

  console.log("checkBizInfo", checkCorpNum);
  bizInfoCheckService.checkBizInfo(CorpNum, checkCorpNum, UserID, successCallback, errorCallback);
};
