import axios from "axios";
import querystring from "querystring";
import { parseDocument } from "htmlparser2";
import { selectOne } from "css-select";
import qs from 'querystring';
import { load } from 'cheerio';
import { chromium } from 'playwright';

const USER_ID = process.env.FILMMAKERS_ID || "taulcontact";
const PASSWORD = process.env.FILMMAKERS_PASSWORD || "wpdlznf@123";

// ==========================================
// 1. 로그인 (토큰 및 쿠키 획득)
// ==========================================
const getLogin = async () => {
  try {


    const data = querystring.stringify({
      error_return_url: "/",
      act: "procMemberLogin",
      success_return_url: "/",
      xe_validator_id: "modules/member/skins",
      user_id: USER_ID,
      password: PASSWORD,
      // _rx_csrf_token: CrsfToken,
    });

    const options = {
      method: "POST",
      url: "https://www.filmmakers.co.kr/index.php?act=procMemberLogin",
      headers: {
        Host: "www.filmmakers.co.kr",
        origin: "https://www.filmmakers.co.kr",
        "Content-Type": "application/x-www-form-urlencoded",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        referer: "https://www.filmmakers.co.kr/member/login",
      },
      params: { act: "procMemberLogin" },
      data: data,
    };
    const response = await axios(options);
    const setCookies = response.headers["set-cookie"];
    const cookies = {
      PHPSESSID: null,
      rx_login_status: null,
    };

    // console.log('loginmessage',response.data.message)
    // console.log('login_csrftoken',response.data)
    if (setCookies) {
      setCookies.forEach((cookie) => {
        if (cookie.startsWith("PHPSESSID=")) cookies.PHPSESSID = cookie.split(";")[0].split("=")[1];
        else if (cookie.startsWith("rx_login_status=")) cookies.rx_login_status = cookie.split(";")[0].split("=")[1];
        else if (cookie.startsWith("cf_clearance=")) cookies.cf_clearance = cookie.split(";")[0].split("=")[1];
      });
    }

    const browserCookie = process.env.FILMMAKERS_COOKIE || "";
    const cfMatch = browserCookie.match(/cf_clearance=([^;]+)/);
    if (cfMatch) cookies.cf_clearance = cfMatch[1];

  //  const getcookie = "PHPSESSID=" + cookies.PHPSESSID + "; rx_login_status=" + cookies.rx_login_status+ '; cf_clearance=8STiNzmiEWqmg1UTHNYF5B5xgXtTVVZWqOIxZyG2n.Y-1780639108-1.2.1.1-pGe_s51Y1pJ6.twaSTbBvj_7kliIvkg08dwW88j4WCv33sFnlOM6MzOpyI25edE3We1U3q1P9T3QNhW4JsWRQJ8fXObeq5hRLJcsNb954sKrXC9O8wmJ2MVIwZJf43NS0tppCTQ4Hx1hy73tnQpUdtQC_j3RrfgY2mA00.aWWT7IVtX4VyJDqpvGmh0Pn0D7iUnawkpYAH6mfpi.jnCjRAY.J..7tSKKC5uwH7kqYtH.M1PdZqN_J3MCK5rAy9lqK3O3mcsMAqBochKnWivj8iM4hOaZy8BRxqCpfMC0LnnvLtSZ6zHkAb_wQ8MG4E_RtiS4_tgVhFpJxvxdBBE2BQ';
    const getcookie = "PHPSESSID=" + cookies.PHPSESSID + "; rx_login_status=" + cookies.rx_login_status;
    // const getcookie = `PHPSESSID=${cookies.PHPSESSID}; rx_login_status=${cookies.rx_login_status} ; cf_clearance=${cookies.cf_clearance}`;
    console.log("getLogin cookie 완성:", getcookie);
    return getcookie;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
};

// ==========================================
// 2. CSRF 토큰 획득
// ==========================================
async function getCsrfToken() {
  try {
  const response = await axios({
  method: 'GET',
  url: 'https://www.filmmakers.co.kr/',
  headers: {
    'authority': 'www.filmmakers.co.kr',
    'accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language':
      'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'accept-encoding': 'gzip, deflate, br',
    'sec-ch-ua':
      '"Chromium";v="148", "Google Chrome";v="148", "Not(A)Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-site': 'none',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'sec-fetch-dest': 'document',
    'upgrade-insecure-requests': '1',
    'priority': 'u=0, i',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    cookie: [
      '_ga=...',
      '_gcl_au=...',
      'cf_clearance=...',
      'PHPSESSID=...',
      'rx_login_status=none'
    ].join('; ')
  },
  validateStatus: () => true,
});
console.log(response.headers);
const html = response.data.substring(0, 3000);
const match = html.match(
  /<meta\s+name="csrf-token"\s+content="([^"]+)"/i
);
const csrfToken = match?.[1];
console.log('csrfToken',csrfToken);
return csrfToken
  } catch (err) {
    console.error("getCsrfToken error:", err.message);
    return null;
  }
}


function mergeCookiesKeepExisting(getCookie, getInfoValue = {}) {
  const jar = {};

  // 기존 쿠키 문자열 파싱
  getCookie.split(';').forEach((item) => {
    const [key, ...rest] = item.trim().split('=');
    const value = rest.join('=');

    if (key && value) {
      jar[key] = value;
    }
  });

  // 새 값 중 null 아닌 것만 덮어쓰기
  Object.entries(getInfoValue).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      jar[key] = value;
    }
  });

  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}



// ==========================================
// 3. 게시글 정보 가져오기
// ==========================================
const getInfo = async (cookie) => {
  try {
    const response = await axios({
      method: "GET",
      url: "https://www.filmmakers.co.kr/locationBank/21206554/edit",
      headers: {
        Cookie: cookie,
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        referer: "https://www.filmmakers.co.kr/locationBank/21206554",
        //https://www.filmmakers.co.kr/locationBank/21206554
      },
      validateStatus: () => true,
      timeout: 20000,
    });

    if (response.status !== 200) return null;

    const document = parseDocument(response.data);

    const titleEl = selectOne('input[name="title"]', document) || selectOne('input[type="text"][name="title"]', document);
    const title = titleEl?.attribs?.value || "";

    let ContentValue = "";
    const textareaEl = selectOne('textarea[name="content"]', document) || selectOne('textarea#content', document);
    const hiddenContentEl = selectOne('input[name="content"]', document);

    if (textareaEl && textareaEl.children[0]) {
      ContentValue = textareaEl.children[0].data;
    } else if (hiddenContentEl) {
      ContentValue = hiddenContentEl.attribs?.value;
    }

    const html = response.data.substring(0, 3000);
    const match = html.match(
      /<meta\s+name="csrf-token"\s+content="([^"]+)"/i
    );
    const csrfToken = match?.[1];

    const setCookies = response.headers["set-cookie"];
    const info_cookies = {
      PHPSESSID: null,
      rx_login_status: null,
    };
    if (setCookies) {
      setCookies.forEach((cookie) => {
        if (cookie.startsWith("PHPSESSID=")) info_cookies.PHPSESSID = cookie.split(";")[0].split("=")[1];
        else if (cookie.startsWith("rx_login_status=")) info_cookies.rx_login_status = cookie.split(";")[0].split("=")[1];
        // else if (cookie.startsWith("cf_clearance=")) cookies.cf_clearance = cookie.split(";")[0].split("=")[1];
      });
    }
    console.log("getinfo_cookies",setCookies)

    return { ContentValue, title ,csrfToken,info_cookies};
  } catch (error) {
    console.error("getInfo Error:", error);
    return null;
  }
};

// ==========================================
// 4. 게시판 수정 API 핸들러
// ==========================================
const postEdit = async () => {
  const now = new Date(); // 현재 시간
  const minute = now.getMinutes(); // 분 단위
  // if (minute % 2 === 0) { await postEditThumbnail() }


 const getCookie = await getLogin();
  // console.log("postEdit_CrsfToken" ,CrsfToken)
  // console.log("postEdit_getCookie" ,getCookie)

  const getInfoVaule = await getInfo(getCookie);

  // console.log("postEdit_getInfoVaule",getInfoVaule)
  // console.log("postEdit_getInfoVaule",getInfoVaule)
  console.log("postEdit_getInfoVaule",getInfoVaule.info_cookies)
  // return
  
console.log({ getCookie: getCookie,getInfoVaule: getInfoVaule.info_cookies})

  const ContentValue = getInfoVaule.ContentValue;
  const title = getInfoVaule.title;
    const NewCrsfToken=getInfoVaule.csrfToken;

const cookieHeader = mergeCookiesKeepExisting(
  getCookie,
  getInfoVaule.info_cookies
);

console.log(cookieHeader);
// return;

  const formData = {
    _filter: "insert",
    mid: "locationBank",
    content: ContentValue,
    document_srl: "21206554",
    category_srl: "2348353",
    title: "[성수동] 400평 단독건물 (야외 마당 촬영, 주차 10대) 입니다.^^",
    extra_vars1: "홍재욱",
    extra_vars3: "010-3101-9551",
    extra_vars4: "taulcontact@gmail.com",
    extra_vars5: "https://www.aubestudio.co.kr/",
    extra_vars2: "04796|@|서울 성동구 아차산로11가길 6|@|(서울 성동구 성수동2가 278-33)",
    file_order_srls:[22814417,22814418,22814419,22814420,22814421,22814422,22814423,22814424,22814425,22814426,22814427,22814428,22814429,22814430,22814432,22814434,22814443,22814444,22814445,22814446,22814447,22814448,22814449,22814450,22814451,22814452,22814453,22814454,22814455,22814456,22814457,22814458,22814459,22814461,22814462,22814463,22814464,22814466,22814467,22814468,22814469,22814470,22814471,22814472,22814474,22814475,24758808,24873190,24873205,26013267,26126645,27219648,27219649,27219650,27219651,27219652,27219653],
    comment_status: "ALLOW",
    notify_message:"N",
    status: "PUBLIC",
    _rx_csrf_token: NewCrsfToken,
    module: "board",
    act: "procBoardInsertDocument",
    _rx_ajax_compat: "XMLRPC",
  };

  let ContentChg = ContentValue.replace(/'/g, "");
  ContentChg = ContentChg.replace(new RegExp("\n +", "g"), "");

  try {
    const options = {
      method: "POST",
      url: "https://www.filmmakers.co.kr/",
      headers: {
        authority: "www.filmmakers.co.kr",
        scheme: "https",
        path: "/",
        // 'content-length': '3000',
        "sec-ch-ua-platform": '"macOS"',
        "x-csrf-token": NewCrsfToken,
        "sec-ch-ua": '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        accept: "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://www.filmmakers.co.kr",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        referer: "https://www.filmmakers.co.kr/locationBank/21206554/edit",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i",
        Cookie: cookieHeader,
      },
      data: querystring.stringify(formData),
      timeout: 20000,
    };
    //console.log('options', options) //여기서 에러 발생하는듯 https://www.filmmakers.co.kr/locationBank/21206554/edit



    const response = await axios(options);

    console.log('reponse', response.data.message)
    // res.json({ message: response.data })
    // console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("postEdit Error:", error);
    return "postEdit Error:" + error;
  }
};


// const postEditTest = async (req, res) => {
//   try {
//     const documentId = req.params.id || "21206554"; // 라우터 파라미터 적용
//     const getCookie = await getLogin();
//     const CrsfToken = await getCsrfToken(getCookie);
//     const getInfoValue = await getInfo(getCookie);

//     if (!getInfoValue || !getInfoValue.ContentValue) {
//       console.log("getInfo 실패: 403 또는 HTML 파싱 실패");
//       return res.status(403).json({ success: false, message: "게시글 정보를 가져오지 못했습니다." });
//     }

//     let ContentChg = getInfoValue.ContentValue.replace(/'/g, "");
//     ContentChg = ContentChg.replace(new RegExp("\n +", "g"), "");

//     const formData = {
//       _filter: "insert",
//       mid: "locationBank",
//       content: ContentChg,
//       document_srl: documentId,
//       category_srl: "2348353",
//       title: getInfoValue.title || "[성수동] 400평 단독건물 (야외 마당 촬영, 주차 10대) 입니다.^^",
//       extra_vars1: "홍재욱",
//       extra_vars3: "010-3101-9551",
//       extra_vars4: "taulcontact@gmail.com",
//       extra_vars5: "https://www.aubestudio.co.kr/",
//       extra_vars2: "04796|@|서울 성동구 아차산로11가길 6|@|(서울 성동구 성수동2가 278-33)",
//       comment_status: "ALLOW",
//       status: "PUBLIC",
//       _rx_csrf_token: CrsfToken,
//       module: "board",
//       act: "procBoardInsertDocument",
//       _rx_ajax_compat: "XMLRPC",
//     };

//     const response = await axios({
//       method: "POST",
//       url: "https://www.filmmakers.co.kr/",
//       headers: {
//         "x-csrf-token": CrsfToken,
//         "x-requested-with": "XMLHttpRequest",
//         "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
//         "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
//         referer: `https://www.filmmakers.co.kr/locationBank/${documentId}/edit`,
//         Cookie: getCookie,
//       },
//       data: querystring.stringify(formData),
//       timeout: 20000,
//     });

//     return res.status(200).json({ success: true, data: response.data });
//   } catch (error) {
//     console.error("postEdit Error:", error);
//     return res.status(500).json({ success: false, message: error.toString() });
//   }
// };

// ==========================================
// 5. 썸네일 수정 API 핸들러
// ==========================================
const postEditThumbnail = async (req, res) => {
  try {
    const documentId = req.params.id || "21206554";
    const getCookie = await getLogin();
    const CrsfToken = await getCrsfToken(getCookie);

    const file_srl = [24993914, 22814417, 22814428, 22814444, 22814467, 24758808, 22814454, 22814430, 24873205];
    const randomOne = file_srl[Math.floor(Math.random() * file_srl.length)];

    const formData = {
      file_srl: randomOne,
      mid: "locationBank",
      editor_sequence: documentId,
      module: "file",
      act: "procFileSetCoverImage",
    };

    const response = await axios({
      method: "POST",
      url: "https://www.filmmakers.co.kr/",
      headers: {
        "x-csrf-token": CrsfToken,
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        referer: `https://www.filmmakers.co.kr/locationBank/${documentId}/edit`,
        Cookie: getCookie,
      },
      data: querystring.stringify(formData),
      timeout: 20000,
    });
    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("postEditThumbnail Error:", error);
    return res.status(500).json({ success: false, message: error.toString() });
  }
};
const filmmakersController = {
  getLogin,
  getInfo,
  postEdit,
  postEditThumbnail,
  getCsrfToken
};

// 여기를 export default 로 변경합니다!
export default filmmakersController;