import { createSuccessCallback, createErrorCallback, taxinvoiceService, CorpNum, UserID } from "../../util/popbillConfig.js";

export const registTaxIssue = async (req, res, next) => {
  const successCallback = createSuccessCallback(req, res, "세금계산서 발행 성공");
  const errorCallback = createErrorCallback(req, res, "세금계산서 발행 실패");
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

    // 합계
    const supplyCostTotal = toStrNum(src.supplyCostTotal);
    const taxTotal = toStrNum(src.taxTotal);
    const totalAmount = toStrNum(src.totalAmount);

    // 공급자
    const invoicerCorpNum = onlyDigits(src.invoicerCorpNum || CORP_NUM);
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

    if (!detailList.length) {
      return res.status(400).json({ message: "품목(detailList)은 최소 1개 이상이어야 합니다." });
    }
    if (!invoiceeCorpNum) {
      return res.status(400).json({ message: "공급받는자 등록번호(invoiceeCorpNum)는 필수입니다." });
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
    taxinvoiceService.registIssue(CorpNum, Taxinvoice, UserID, successCallback, errorCallback);
  } catch (err) {
    console.error(err);
    return errorCallback(err);
  }
};

// export const registTaxIssue = async (req, res, next) => {
//   const successCallback = createSuccessCallback(req, res, "세금계산서 발행 성공");
//   const errorCallback = createErrorCallback(req, res, "세금계산서 발행 실패");
//   const Taxinvoice = {
//     /************************************************************************
//      * 세금계산서 공통 필수 항목
//      **************************************************************************/
//     issueType: "정발행", // [필수] 발행형태: (정발행, 역발행, 위수탁) 중 택 1
//     taxType: "과세", // [필수] 과세형태: (과세, 영세, 면세) 중 택 1
//     chargeDirection: "정과금", // [필수] 과금방향: (정과금, 역과금) 중 택 1
//     writeDate: "20251001", // [필수] 작성일자: 형식 yyyyMMdd
//     purposeType: "영수", // [필수] 영수/청구: (영수, 청구, 없음) 중 택 1
//     supplyCostTotal: "10000", // [필수] 공급가액 합계
//     taxTotal: "1000", // [필수] 세액 합계
//     totalAmount: "11000", // [필수] 합계금액 (공급가액 합계 + 세액 합계)
//     /************************************************************************
//      * 공급자 정보 (필수)
//      **************************************************************************/
//     invoicerCorpNum: CorpNum, // [필수] 공급자 사업자번호 ('-' 제외)
//     invoicerMgtKey: mgtKey, // [조건부 필수] 정발행시 공급자 문서번호
//     invoicerCorpName: "공급자 상호", // [필수] 공급자 상호
//     invoicerCEOName: "대표자 성명", // [필수] 공급자 대표자 성명
//     /************************************************************************
//      * 공급받는자 정보 (필수)
//      **************************************************************************/
//     invoiceeType: "사업자", // [필수] 공급받는자 유형: (사업자, 개인, 외국인) 중 택 1
//     invoiceeCorpNum: "8888888888", // [필수] 공급받는자 등록번호 ('-' 제외)
//     invoiceeCorpName: "공급받는자 상호", // [필수] 공급받는자 상호
//     invoiceeCEOName: "공급받는자 대표자 성명", // [필수] 공급받는자 대표자 성명
//     /************************************************************************
//      * 품목 상세정보 (실제 발행을 위해 최소 1개 항목 추가)
//      **************************************************************************/
//     detailList: [
//       {
//         serialNum: 1, // 일련번호
//         purchaseDT: "20251001", // 거래일자
//         itemName: "서비스 이용료",
//         spec: "1건",
//         qty: "1", // 수량
//         unitCost: "10000", // 단가
//         supplyCost: "10000", // 공급가액 (10000)
//         tax: "1000", // 세액 (1000)
//         remark: "필수 품목",
//       },
//     ],
//   };
//   taxinvoiceService.registIssue(CorpNum, Taxinvoice, UserID, successCallback, errorCallback);
// };
