// src/configs/popbillConfig.js (예시 경로)

import popbill from "popbill";
import dotenv from "dotenv"; // 환경 변수 로드용 (필요하다면)

// 환경 변수가 이미 로드되었다고 가정
// dotenv.config();

popbill.config({
  LinkID: process.env.POPBILL_LINK_ID,
  SecretKey: process.env.POPBILL_SECRET_KEY,
  IsTest: true,
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log("Error Occur : [" + Error.code + "] " + Error.message);
  },
});

// 팝빌 서비스 객체들을 초기화하고 export 합니다.
export const kakaoService = popbill.KakaoService();
export const easyFinBankService = popbill.EasyFinBankService(); // EasyFinBank도 사용한다면 추가
export const bizInfoCheckService = popbill.BizInfoCheckService();
export const taxinvoiceService = popbill.TaxinvoiceService();
// 자주 사용되는 상수도 여기서 export 합니다.
export const CorpNum = process.env.POPBILL_CORP_NUM;
export const UserID = process.env.POPBILL_USER_ID;
export const BANK_ACCOUNT = process.env.POPBILL_BANK_ACCOUNT;
/**
 * 팝빌 API 호출 성공 시 처리를 담당하는 함수를 반환합니다.
 * @param {object} req - Express 요청 객체
 * @param {object} res - Express 응답 객체
 * @param {string} successMessage - 성공 시 클라이언트에게 보낼 메시지
 * @returns {function} 팝빌 success 콜백 함수
 */
export const createSuccessCallback = (req, res, successMessage = "요청 성공") => {
  return (result) => {
    // console.log(`Success: Popbill API Call [${req.path}]`, result);
    console.log(`Success: Popbill API Call [${req.path}]`, result);

    // 팝빌 API마다 'result'의 형태가 다르므로, 필요한 데이터는 여기서 추출
    const data = result;

    res.json({
      message: successMessage,
      data: data,
    });
  };
};

/**
 * 팝빌 API 호출 오류 시 처리를 담당하는 함수를 반환합니다.
 * @param {object} req - Express 요청 객체
 * @param {object} res - Express 응답 객체
 * @param {string} failureMessage - 실패 시 클라이언트에게 보낼 기본 메시지
 * @returns {function} 팝빌 error 콜백 함수
 */
export const createErrorCallback = (req, res, failureMessage = "API 요청 실패") => {
  return (Error) => {
    console.error(`Error: Popbill API Call [${req.path}]`, {
      code: Error.code,
      message: Error.message,
    });

    // 오류 코드(Error.code)가 팝빌 표준 오류 코드라면 그대로 사용, 아니면 500 사용
    const statusCode = Math.abs(Error.code) || 500;

    res.status(statusCode).json({
      message: failureMessage,
      code: Error.code,
      details: Error.message,
    });
  };
};
