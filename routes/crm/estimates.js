// routes/crm/estimates.js (ESM)
import express from "express";
import ejs from "ejs";
import path from "path";
import puppeteer from "puppeteer";
import fs from "fs";
import os from "os";
import { fileURLToPath, pathToFileURL } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 유틸 =====
const krDate = (yyyyMMddLike) => {
  const d =
    typeof yyyyMMddLike === "string"
      ? new Date(yyyyMMddLike)
      : yyyyMMddLike || new Date();
  return `${d.getFullYear()} 년 ${d.getMonth() + 1} 월 ${d.getDate()} 일`;
};

const vat10 = (supply) => Math.round((Number(supply) || 0) * 0.1);

const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// ===== 라우트 =====
router.post("/pdf", async (req, res) => {
  try {
    // 1) 입력 파싱
    console.log(req);
    const body = req.body && Object.keys(req.body).length ? req.body : {};
    const q = req.query || {};

    const customerName = body.customerName || q.customerName || "고객명";
    const no = body.no || q.no || `TEMP-${Date.now()}`;
    const dateKR = krDate(body.date || q.date || new Date());
    // const startTime = body.startTime || "00:00";
    // const endTime = body.endTime || "00:00";
    const bankInfo =
      body.bankInfo || q.bankInfo || "기업은행 027-162297-04-021 (주)타울";

    const supplier = {
      regNo: "149-88-02941",
      corpName: "(주)타울",
      ceo: "김완준 외 1명",
      address: "서울시 동대문구 장한로 53, 5층 504호",
      bizType: "서비스업",
      item: "스튜디오렌탈",
      tel: "010-3101-9551",
      ...(body.supplier || {}),
    };

    // 2) 품목 정리
    let items = Array.isArray(body.items) ? body.items : undefined;
    if (!items || items.length === 0) {
      const amount = toNum(body.amount ?? q.amount, 0);
      items = [{ name: "스튜디오 렌탈", spec: "", qty: 1, unit: amount }];
    }

    const normalized = items.map((it) => {
      const qty = toNum(it.qty, 1);
      const unit = toNum(it.unit, 0);
      const supply = qty * unit;
      return {
        name: it.name || "항목",
        spec: it.spec || "",
        qty,
        unit,
        supply,
        tax: vat10(supply),
      };
    });

    const totalSupply = normalized.reduce((s, x) => s + (x.supply || 0), 0);
    const totalTax = normalized.reduce((s, x) => s + (x.tax || 0), 0);

    const data = {
      no,
      dateKR,
      customerName,
      bankInfo,
      supplier,
      items: normalized,
      totalSupply,
      totalTax,
    };

    // 3) 경로 고정(__dirname 기준)
    const templatePath = path.resolve(
      __dirname,
      "../../templates/estimate.ejs"
    );
    const stampPath = path.resolve(__dirname, "../../assets/stamp.png");
    let stampUrl = null;
    if (fs.existsSync(stampPath)) {
      const buf = fs.readFileSync(stampPath);
      const base64 = buf.toString("base64");
      stampUrl = `data:image/png;base64,${base64}`;
    }

    // const stampPath = path.resolve(__dirname, "../../assets/stamp.png");
    // // const stampUrl = "file://" + stampPath;
    // console.log('stampPath',stampPath)
    // const stampUrl = fs.existsSync(stampPath) ? pathToFileURL(stampPath).href : null;

    // 4) EJS -> HTML
    const html = await ejs.renderFile(
      templatePath,
      { ...data, stampUrl },
      { async: true }
    );

    // 5) Puppeteer PDF 생성
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfRaw = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });

    await browser.close();

    // 6) 항상 Buffer 보장 + 유효성 검사
    const pdf = Buffer.isBuffer(pdfRaw) ? pdfRaw : Buffer.from(pdfRaw);
    const magic = pdf.toString("ascii", 0, 4);

    if (magic !== "%PDF" || pdf.length < 1000) {
      const tmpHtml = path.join(
        os.tmpdir(),
        `estimate_debug_${Date.now()}.html`
      );
      const tmpPdf = path.join(os.tmpdir(), `estimate_debug_${Date.now()}.bin`);
      await fs.promises.writeFile(tmpHtml, html, "utf8");
      await fs.promises.writeFile(tmpPdf, pdf);

      console.error("[PDF ERROR] invalid output:", {
        size: pdf.length,
        head: magic,
        htmlSaved: tmpHtml,
        pdfSaved: tmpPdf,
      });

      return res.status(500).json({
        message: "PDF 렌더 실패",
        size: pdf.length,
        head: magic,
        htmlSaved: tmpHtml,
        pdfSaved: tmpPdf,
      });
    }

    // 7) 최종 전송
    const fname = `estimate_${customerName}_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fname)}"`
    );
    res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader("Accept-Ranges", "bytes");

    return res.end(pdf);
  } catch (e) {
    console.error("[/api/estimates/pdf] error:", e);
    return res
      .status(500)
      .json({ message: "PDF 생성 실패", error: String(e?.message || e) });
  }
});

export default router;
