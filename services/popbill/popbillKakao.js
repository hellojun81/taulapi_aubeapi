import { schedule } from "node-cron";
import sql from "../../lib/crm/sql.js";
import { createSuccessCallback, createErrorCallback, kakaoService, CorpNum, UserID } from "../../util/popbillConfig.js";

export const Templatelist = async (req, res, next) => {
  const successCallback = customSuccessCallback(req, res, "카카오 템플릿 목록 조회 성공");
  const errorCallback = createErrorCallback(req, res, "카카오 템플릿 목록 조회 실패");
  kakaoService.listATSTemplate(CorpNum, UserID, successCallback, errorCallback);
};

export const TemplateContent = (req, res, next) => {
  const templateCode = req.query.templateCode || "025100000322";
  const successCallback = createSuccessCallback(req, res, "카카오 템플릿 본문 조회 성공");
  const errorCallback = createErrorCallback(req, res, "카카오 템플릿  본문 조회 실패");
  kakaoService.getATSTemplate(CorpNum, templateCode, UserID, successCallback, errorCallback);
};
export const getSendMessages = (req, res, next) => {
  // const ReceiptNum = "025101511014300001";
  const ReceiptNum = "025101609215300001";
  const successCallback = createSuccessCallback(req, res, "카카오 템플릿 본문 조회 성공");
  const errorCallback = createErrorCallback(req, res, "카카오 템플릿  본문 조회 실패");

  kakaoService.getMessages(CorpNum, ReceiptNum, UserID, successCallback, errorCallback);
};

export const SendMessageHistory = async (req, res, next) => {
  const { scheduleId } = req.query;
  const query = `SELECT created_at,content,receiver  FROM    message_logs WHERE scheduleId = ? and status='SENT_SUCCESS';`;
  const value = [scheduleId];
  const result = await sql.executeQuery(query, value);
  console.log("sendMessageHistory");
  return res.status(200).json({
    scheduleId,
    data: result,
    message: "메시지 발송 이력 조회 성공",
  });
};
export const SendMessageHistoryCount = async (req, res, next) => {
  const { scheduleId } = req.query;
  const query = `SELECT COUNT(*) AS historyCounter FROM    message_logs WHERE scheduleId = ? and status='SENT_SUCCESS';`;
  const value = [scheduleId];
  const result = await sql.executeQuery(query, value);
  const count = result?.[0]?.historyCounter ?? 0;
  return res.status(200).json({
    scheduleId,
    historyCounter: count,
    message: "메시지 발송 이력 조회 성공",
  });
};

export const MessageSend = async (req, res, next) => {
  try {
    // 1️⃣ 프론트에서 전달받은 값 구조 분해
    const sender = "01031019551";
    const {
      templateCode,
      receiver, // 수신번호
      receiverName = "",
      content,
      altContent = "알림톡 대체 문자",
      altSendType = "A",
      sndDT = "",
      UserID = "TAULAPI",
      btns = null,
      ID,
    } = req.body;
    const scheduleId = ID;
    console.log("MessgeSend scheduleId", scheduleId);
    // 2️⃣ 필수값 검증
    if (!templateCode || !receiver || !content) {
      return res.status(400).json({
        message: "templateCode, receiver, content는 필수입니다.",
      });
    }

    const testCorpNum = CorpNum || "1498802941"; // 사업자번호
    const requestNum = ""; // (선택) 요청 고유번호

    // ----------------------------------------------------------------------
    // 3️⃣ 성공 콜백
    // ----------------------------------------------------------------------
    const successCallback = async (response) => {
      const { requestNum } = response;
      const logData = {
        templateCode,
        sender,
        receiver,
        receiverName,
        content,
        altContent,
        requestNum,
        status: "SENT_SUCCESS",
        errorMessage: null,
        scheduleId,
      };

      await saveMessageLog(logData);

      res.status(200).json({
        message: "카카오톡 전송 성공 및 로그 저장 완료",
        requestNum,
      });
    };

    // ----------------------------------------------------------------------
    // 4️⃣ 실패 콜백
    // ----------------------------------------------------------------------
    const errorCallback = async (error) => {
      console.error("카카오톡 전송 실패:", error);
      const logData = {
        templateCode,
        sender,
        receiver,
        receiverName,
        content,
        altContent,
        requestNum: null,
        status: "SENT_FAILURE",
        errorMessage: error.message || "Unknown error",
        scheduleId,
      };
      await saveMessageLog(logData);

      res.status(500).json({
        message: "카카오톡 전송 실패",
        error: error.message,
      });
    };

    // ----------------------------------------------------------------------
    // 5️⃣ Popbill 카카오 알림톡 발송 호출
    // ----------------------------------------------------------------------
    kakaoService.sendATS_one(
      testCorpNum,
      templateCode,
      sender,
      content,
      altContent,
      altSendType,
      sndDT,
      receiver,
      receiverName,
      UserID,
      requestNum,
      btns,
      successCallback,
      errorCallback
    );
  } catch (err) {
    console.error("MessageSend API 오류:", err);
    res.status(500).json({
      message: "서버 오류 발생",
      error: err.message,
    });
  }
};

const saveMessageLog = async (logData) => {
  console.log("logData", logData);
  const { templateCode, sender, receiver, receiverName, content, altContent, requestNum, status, errorMessage, scheduleId } = logData;

  const query = `
    INSERT INTO message_logs 
    (request_num, template_code, sender, receiver, receiver_name, content, alt_content, status, error_message,scheduleId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  `;

  // SQL 쿼리 실행에 사용할 값 배열 (순서 중요)
  const values = [requestNum || null, templateCode, sender, receiver, receiverName, content, altContent, status, errorMessage || null, scheduleId];

  let connection;
  try {
    const result = await sql.executeQuery(query, values);

    console.log("메시지 로그가 MySQL에 성공적으로 저장되었습니다. Insert ID:", result.insertId);
  } catch (error) {
    // DB 저장 오류 처리 (예: 접수번호 중복 등)
    console.error("메시지 로그 MySQL 저장 중 오류 발생:", error);
  } finally {
    if (connection) connection.release(); // 사용 후 연결을 풀에 반환
  }
};

const prioritizeTemplate = (result) => {
  const TARGET_TEMPLATE_CODE = "025100000319";

  const data = result ? [...result] : [];

  const targetIndex = data.findIndex((item) => item.templateCode && item.templateCode.trim() === TARGET_TEMPLATE_CODE);

  if (targetIndex > 0) {
    // 템플릿을 배열에서 제거하고, 그 요소를 배열 맨 앞에 다시 삽입합니다.
    const targetTemplate = data.splice(targetIndex, 1)[0];
    data.unshift(targetTemplate);
  }

  // 수정된 data 배열로 결과 객체를 반환합니다.
  return {
    ...result,
    data: data,
  };
};

// 커스텀 성공 콜백 함수: 데이터를 조작한 후 응답합니다.
const customSuccessCallback = (req, res, message) => (result) => {
  console.log("modifiedResult", result);
  const modifiedResult = prioritizeTemplate(result);
  return res.status(200).json({
    message: message,
    data: modifiedResult.data, // data 필드만 포함하여 응답 구조를 유지
  });
};
