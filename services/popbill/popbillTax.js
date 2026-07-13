import { createSuccessCallback, createErrorCallback, taxinvoiceService, CorpNum, UserID } from "../../util/popbillConfig.js";
import sql from "../../lib/crm/sql.js";
export const registTaxIssue = async (req, res, next) => {
  // ... (makeMgtKey, body, src, 정규화/변수 설정 로직 유지) ...
  const makeMgtKey = () => `TI-${Date.now()}`;
  try {
    const body = req.body || {};
    const src = body.taxinvoice || {};
    console.log("body", body);
    // 안전 가드/정규화
    const onlyDigits = (s = "") => String(s).replace(/[^0-9]/g, "");
    const yyyymmdd = (s = "") => String(s).replaceAll("-", "");
    const toStrNum = (n) => (n == null ? "0" : String(n));

    // 필수/기본값 세팅
    const issueType = src.issueType || "정발행";
    const taxType = src.taxType || "과세";
    const purposeType = src.purposeType || "영수";
    const chargeDirection = src.chargeDirection || "정과금";
    const writeDate = yyyymmdd(src.writeDate);
    const scheduleId = src.scheduleId;
    // 합계
    const supplyCostTotal = toStrNum(src.supplyCostTotal);
    const taxTotal = toStrNum(src.taxTotal);
    const totalAmount = toStrNum(src.totalAmount);

    // 공급자
    const invoicerCorpNum = onlyDigits(src.invoicerCorpNum || CorpNum);
    const invoicerMgtKey = src.invoicerMgtKey || makeMgtKey();
    const invoicerCorpName = src.invoicerCorpName || "";
    const invoicerCEOName = src.invoicerCEOName || "";
    const invoicerAddr = src.invoicerAddr || "";
    const invoicerBizType = src.invoicerBizType || "";
    const invoicerBizClass = src.invoicerBizClass || "";
    const invoicerContactName = src.invoicerContactName || "";
    const invoicerEmail = src.invoicerEmail || "";
    const invoicerTEL = src.invoicerTEL || "";

    // 공급받는자
    const invoiceeType = src.invoiceeType || "사업자";
    const invoiceeCorpNum = onlyDigits(src.invoiceeCorpNum || "");
    const invoiceeCorpName = src.invoiceeCorpName || "";
    const invoiceeCEOName = src.invoiceeCEOName || "";
    const invoiceeAddr = src.invoiceeAddr || "";
    const invoiceeBizType = src.invoiceeBizType || "";
    const invoiceeBizClass = src.invoiceeBizClass || "";
    const invoiceeContactName1 = src.invoiceeContactName1 || "";
    const invoiceeEmail1 = src.invoiceeEmail1 || "";
    const invoiceeTEL1 = src.invoiceeTEL1 || "";

    // 품목
    const detailList = (src.detailList || []).map((d, i) => ({
      serialNum: d.serialNum ?? i + 1,
      purchaseDT: yyyymmdd(d.purchaseDT || writeDate),
      itemName: d.itemName || "",
      spec: d.spec || "",
      qty: toStrNum(d.qty),
      unitCost: toStrNum(d.unitCost),
      supplyCost: toStrNum(d.supplyCost),
      tax: toStrNum(taxType === "과세" ? d.tax : 0),
      remark: d.remark || "",
    }));

    if (!/^\d{8}$/.test(writeDate)) {
      return res.status(400).json({ message: "작성일자(writeDate)는 YYYYMMDD 형식이어야 합니다." });
    }
    if (invoicerCorpNum.length !== 10) {
      return res.status(400).json({ message: "공급자 등록번호(invoicerCorpNum)는 10자리여야 합니다." });
    }
    if (!detailList.length) {
      return res.status(400).json({ message: "품목(detailList)은 최소 1개 이상이어야 합니다." });
    }
    if (invoiceeCorpNum.length !== 10) {
      return res.status(400).json({ message: "공급받는자 등록번호(invoiceeCorpNum)는 10자리여야 합니다." });
    }
    if (detailList.some((item) => !item.itemName || Number(item.supplyCost) <= 0)) {
      return res.status(400).json({ message: "각 품목의 품목명과 0보다 큰 공급가액은 필수입니다." });
    }
    if (Number(supplyCostTotal) <= 0 || Number(totalAmount) <= 0) {
      return res.status(400).json({ message: "공급가액과 합계금액은 0보다 커야 합니다." });
    }

    // Popbill 요청 객체
    const Taxinvoice = {
      issueType,
      taxType,
      chargeDirection,
      writeDate,
      purposeType,
      supplyCostTotal,
      taxTotal,
      totalAmount,

      invoicerCorpNum,
      invoicerMgtKey,
      invoicerCorpName,
      invoicerCEOName,
      invoicerAddr,
      invoicerBizType,
      invoicerBizClass,
      invoicerContactName,
      invoicerEmail,
      invoicerTEL,

      invoiceeType,
      invoiceeCorpNum,
      invoiceeCorpName,
      invoiceeCEOName,
      invoiceeAddr,
      invoiceeBizType,
      invoiceeBizClass,
      invoiceeContactName1,
      invoiceeEmail1,
      invoiceeTEL1,

      detailList,
      serialNum: src.serialNum || "1",
      remark: src.remark || "",
    };

    const popbillResult = await new Promise((resolve, reject) => {
      // taxinvoiceService, CorpNum, UserID는 임포트되어 있어야 합니다.
      taxinvoiceService.registIssue(
        CorpNum,
        Taxinvoice,
        UserID,
        (result) => {
          resolve(result); // 성공 시 result 객체를 resolve
        },
        (error) => {
          reject(error); // 오류 시 error 객체(팝빌 오류 응답 포함)를 reject
        }
      );
    });

    await saveTaxInvoiceToDB(Number(scheduleId), Taxinvoice, popbillResult);

    // 🚨 2. 성공 응답 반환 (누락된 부분)
    return res.status(200).json({
      message: "세금계산서 발행 및 DB 저장 성공",
      popbill: popbillResult,
      mgtKey: Taxinvoice.invoicerMgtKey,
    });
  } catch (err) {
    console.error("세금계산서 처리 오류:", err);

    const errorBody = err?.response ? JSON.parse(err.response) : err || {};
    const errorMessage = errorBody.message || err.message || "알 수 없는 오류가 발생했습니다.";
    const errorCode = errorBody.code || err.code;

    return res.status(500).json({
      message: "세금계산서 발행 처리 실패",
      error: errorMessage,
      popbillErrorCode: errorCode,
    });
  }
};

/**
 * 발행된 세금계산서의 핵심 정보를 DB에 저장합니다.
 * @param {number} scheduleId - 연관된 스케줄 ID
 * @param {object} taxInvoiceData - Popbill 요청 객체 (Taxinvoice)
 * @param {object} popbillResult - Popbill API 응답 결과 객체
 */
export const saveTaxInvoiceToDB = async (scheduleId, taxInvoiceData, popbillResult) => {
  // 팝빌 성공 응답 코드가 아닌 경우 DB 저장을 시도하지 않습니다.
  if (popbillResult.code !== 1) {
    throw new Error(`Popbill API 응답 오류: Code ${popbillResult.code}, Message: ${popbillResult.message}`);
  }

  const query = `
      INSERT INTO tax_invoices (
        schedule_id, popbill_mgt_key, popbill_invoicer_corpnum, popbill_tx_id, issue_type, tax_type, purpose_type, write_date,
        supply_cost_total, tax_total, total_amount, 
        invoicee_corp_num, invoicee_corp_name, invoicee_contact_name, invoicee_email, is_issued
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

  const insertValues = [
    scheduleId, // 🚨 schedule_id 추가
    taxInvoiceData.invoicerMgtKey,
    taxInvoiceData.invoicerCorpNum,
    popbillResult.tqsid || null,
    taxInvoiceData.issueType,
    taxInvoiceData.taxType,
    taxInvoiceData.purposeType,
    taxInvoiceData.writeDate,
    taxInvoiceData.supplyCostTotal,
    taxInvoiceData.taxTotal,
    taxInvoiceData.totalAmount,
    taxInvoiceData.invoiceeCorpNum,
    taxInvoiceData.invoiceeCorpName,
    taxInvoiceData.invoiceeContactName1,
    taxInvoiceData.invoiceeEmail1,
  ];
  const result = await sql.executeQuery(query, insertValues);
  // 🚨 실제 DB 삽입 로직 (사용자의 DB 클라이언트에 맞게 수정 필요)

  console.log(`[DB] 세금계산서 저장 완료: ScheduleID=${scheduleId}, MgtKey=${taxInvoiceData.invoicerMgtKey}`);
};
