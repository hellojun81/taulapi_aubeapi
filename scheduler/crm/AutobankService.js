import "dotenv/config"; // BANKDA_ID/BANKDA_PW 사용시
import axiosOrig from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import iconv from "iconv-lite";
import qs from "qs";
import * as cheerio from "cheerio";
import sql from "../../lib/crm/sql.js"; // ← 다른 컴포넌트에서 가져오는 MySQL 풀

// 1) 쿠키를 유지할 수 있는 axios 인스턴스 (한 번만 생성)
const axios = wrapper(axiosOrig.create({ withCredentials: true }));
const jar = new CookieJar();
// ---------- utils ----------
const clean = (t) => (t || "").replace(/\s+/g, " ").trim();
const parseKRW = (s) => {
  const v = (s || "").replace(/[,\s원]/g, "");
  return v && v !== "." && !isNaN(Number(v)) ? Number(v) : 0;
};
const UPSERT_SQL = `
  INSERT INTO BankTransactions
    (bkcode, tx_datetime, bank_name, account_no, flow_type, summary, channel, memo,
     deposit_amount, withdraw_amount, balance)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    tx_datetime = VALUES(tx_datetime),
    bank_name   = VALUES(bank_name),
    account_no  = VALUES(account_no),
    flow_type   = VALUES(flow_type),
    summary     = VALUES(summary),
    channel     = VALUES(channel),
    memo        = VALUES(memo),
    deposit_amount  = VALUES(deposit_amount),
    withdraw_amount = VALUES(withdraw_amount),
    balance     = VALUES(balance),
    updated_at  = CURRENT_TIMESTAMP
`;

async function upsertMany(rows, { chunkSize = 500 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return { affected: 0 };

  let conn;                // 🔹 먼저 정의
  let affected = 0;

  try {
    // ✅ 프라미스 풀 사용 (중요)
    conn = await sql.db.getConnection();      // sql.db는 pool.promise()
    await conn.beginTransaction();

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      for (const r of chunk) {
        const [ret] = await conn.query(UPSERT_SQL, [
          r.bkcode,
          r.tx_datetime,
          r.bank_name || null,
          r.account_no || null,
          r.flow_type || null,
          r.summary || null,
          r.channel || null,
          r.memo || null,
          r.deposit_amount || 0,
          r.withdraw_amount || 0,
          r.balance || 0,
        ]);
        affected += ret?.affectedRows || 0;
      }
    }

    await conn.commit();
    return { affected };
  } catch (err) {
    if (conn) await conn.rollback();          // 🔹 conn 있을 때만
    throw err;
  } finally {
    if (conn) conn.release();                 // 🔹 conn 있을 때만
  }
}

const loginBankda = async () => {
  try {
    const url = "https://www.bankda.com/login.php";

    const data = qs.stringify({
      Mid: "taul",
      Mpassword: "dkffjqb@81",
      "login_submit.x": "27",
      "login_submit.y": "18",
    });

    const response = await axios.post(url, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      withCredentials: true,
    });

    console.log("✅ 로그인 성공");
    return response.headers["set-cookie"]; // 쿠키 반환
  } catch (error) {
    console.error("❌ 로그인 오류:", error.message);
    return null;
  }
};
const fetchTransactions = async (cookies) => {
  try {
    const url =
      "https://www.bankda.com/account/search.php?Selbk=100&Serbk=1&sel_year=1&s_year=2025&s_month=06&s_day=03&e_year=2025&e_month=09&e_day=03&Ck_inout=to&Keyword=&ckShowBktime=on&ckShowBottomReport=on";

    // ⚠️ EUC-KR 디코딩을 위해 arraybuffer로 받기 + 쿠키 첨부
    const resp = await axios.get(url, {
      headers: { Cookie: cookies.join("; "), "User-Agent": "Mozilla/5.0" },
      responseType: "arraybuffer",
    });

    const html = iconv.decode(Buffer.from(resp.data), "euc-kr");
    const $ = cheerio.load(html);

    const rows = [];

    // ✅ 검색 결과 행 패턴
    $('tr[height="30"]').each((_, tr) => {
      const $tr = $(tr);
      const tds = $tr.find("> td");
      if (tds.length < 6) return;

      // 1) 날짜/시간 (첫 번째 td)
      const tx_datetime = clean($(tds[0]).text());
      if (!/^\d{4}-\d{2}-\d{2}/.test(tx_datetime)) return; // 가드

      // 2) 은행 셀 + title="매출 | 02716229704021"
      const bankTd = $(tds[1]);
      const bank_name = clean(bankTd.text());
      const title = bankTd.attr("title") || "";
      let flow_type = "";
      let account_no = "";
      if (title.includes("|")) {
        const [left, right] = title.split("|");
        flow_type = clean(left);
        account_no = clean(right);
      }

      // 3) 적요/채널 (세 번째 td 내부 span#bkjukyoExtNN)
      const detailTd = $(tds[2]);
      const summary =
        clean(detailTd.find('span[id^="bkjukyoExt"] font[color="#000000"]').first().text()) ||
        clean(detailTd.find('span[id^="bkjukyoExt"]').first().text().split("(")[0]);
      const channel =
        clean(detailTd.find('span[id^="bkjukyoExt"] font[color="#545454"]').first().text()) ||
        clean((detailTd.find('span[id^="bkjukyoExt"]').first().text().match(/\((.*?)\)/) || [])[1]);

      // 4) 금액들: align="right" 3개 (입금/출금/잔액)
      const rights = $tr.find('td[align="right"]');
      if (rights.length < 3) return;
      const deposit_amount = parseKRW(clean($(rights[0]).text()));
      const withdraw_amount = parseKRW(clean($(rights[1]).text()));
      const balance = parseKRW(clean($(rights[2]).text()));

      // 5) bkcode: 메모 영역 hidden input
      const bkcode = Number($tr.find('input[name^="hdbkcode"]').attr("value") || 0);

      // 6) 메모(있으면)
      const memo = extractMemoFromRow($, $tr);

      const item = {
        bkcode,
        tx_datetime,
        bank_name,
        account_no,
        flow_type,
        summary,
        channel,
        memo,
        deposit_amount,
        withdraw_amount,
        balance,
      };
      console.log(item)
      rows.push(item);
    });
    console.log(`📊 추출된 건수: ${rows.length}`);
    return rows;
  } catch (error) {
    console.error("❌ 거래내역 가져오기 오류:", error.message);
    return [];
  }
};

const run = async () => {
  const cookies = await loginBankda();
  if (!cookies) return;
  const rows = await fetchTransactions(cookies);
  if (rows.length === 0) return;

  const result = await upsertMany(rows);
  console.log("💾 DB 저장 결과:", result);
};
function extractMemoFromRow($, $tr) {
  const exp = clean($tr.find('span[id^="expMemoValue"]').first().text());
  if (exp) return exp;
  const memo = clean($tr.find('span[id^="memoValue"]').first().text());
  if (memo) return memo;
  return "";
}

export default {
    run,

};
