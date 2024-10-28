import axios from 'axios';
import querystring from 'querystring';
// import cheerio from 'cheerio';
// import { JSDOM } from 'jsdom';
import { parseDocument } from 'htmlparser2';
import { selectOne } from 'css-select';

import { wrapper } from 'axios-cookiejar-support';
import tough from 'tough-cookie';
import { parse } from 'set-cookie-parser';



const getCookiesFromSite = async () => {
    try {
        const response = await axios.get('https://www.filmmakers.co.kr', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
            }
        });

        // 응답 헤더에서 쿠키 가져오기
        const cookies = parse(response.headers['set-cookie'], {
            map: true
        });

        console.log("Cookies:", cookies.PHPSESSID.value);
        return  cookies.PHPSESSID.value;
    } catch (error) {
        console.error("Error fetching cookies:", error);
    }
};

const getLogin = async (cookie) => {
    try {
        const options = {
            method: 'POST',
            url: 'https://www.filmmakers.co.kr/index.php?act=procMemberLogin',
            headers: {
                'method': 'POST', 
                'authority': 'www.filmmakers.co.kr', 
                'scheme': 'https', 
                'path': '/index.php?act=procMemberLogin', 
                'pragma': 'no-cache', 
                'cache-control': 'no-cache', 
                'origin': 'https://www.filmmakers.co.kr', 
                'content-type': 'application/x-www-form-urlencoded', 
                'upgrade-insecure-requests': '1', 
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36', 
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
                'sec-fetch-site': 'same-origin', 
                'sec-fetch-mode': 'navigate', 
                'sec-fetch-user': '?1', 
                'sec-fetch-dest': 'document', 
                'referer': 'https://www.filmmakers.co.kr/actorsAudition', 
                'accept-encoding': 'gzip, deflate, br, zstd', 
                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7', 
                'priority': 'u=0, i', 
                'Cookie': 'PHPSESSID='+cookie
            },
            data: querystring.stringify({
                'error_return_url': '/actorsAudition',
                'mid': 'actorsAudition',
                'ruleset': '@login',
                'act': 'procMemberLogin',
                'success_return_url': '/actorsAudition',
                'xe_validator_id': 'widgets/login_info/skins/default/login_form/1',
                'user_id': 'taulcontact',
                'password': 'h23585858!'
            })
        };
      
 

        const response = await axios(options);
        const html = response.data;
        // console.log(html)
        const document = parseDocument(html);

        // CSS 선택자로 요소 선택
        const metaTag = selectOne('meta[name="csrf-token"]', document);
        const csrfToken = metaTag?.attribs?.content;
        // console.log('getLogin',csrfToken)
        // const $ = cheerio.load(html);
        // const csrfToken = $('meta[name="csrf-token"]').attr('content');
        // res.json({ message: csrfToken });
        return csrfToken

    } catch (error) {
        console.error('Error:', error);
        // res.status(500).json({ error: 'Failed to log in' });
    }
};

const getInfo = async (cookie) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://www.filmmakers.co.kr/locations/21206554/edit',
            headers: {
                'Cookie': 'PHPSESSID='+cookie
            }
        };

        const response = await axios(options);
        const html = response.data;
        const document = parseDocument(html);

        const metaContentValue = selectOne('input[type="hidden"][name="content"]', document);
        const ContentValue = metaContentValue?.attribs?.value;

        const inputElement = selectOne('input[type="text"][name="title"]', document);
        const title = inputElement?.attribs?.value;

        
        console.log({ ContentValue: ContentValue, title: title })
        return { ContentValue: ContentValue, title: title }
    } catch (error) {
        console.error('Error:', error);
    }
}

const postEdit = async (req, res) => {
    const getCookies=await getCookiesFromSite()
    const csrfToken = await getLogin( getCookies)
    const getInfoVaule = await getInfo(getCookies)
    const ContentValue = getInfoVaule.ContentValue
    const title = getInfoVaule.title
    console.log({'csrfToken':csrfToken,title:title})
        try {
          const options = {
            method: 'POST',
            url: 'https://www.filmmakers.co.kr/',
            headers: {
              'authority': 'www.filmmakers.co.kr',
              'scheme': 'https',
              'path': '/',
              'content-length': '3000',
              'sec-ch-ua-platform': '"macOS"',
              'x-csrf-token': csrfToken,
              'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
              'sec-ch-ua-mobile': '?0',
              'x-requested-with': 'XMLHttpRequest',
              'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              'accept': 'application/json, text/javascript, */*; q=0.01',
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'origin': 'https://www.filmmakers.co.kr',
              'sec-fetch-site': 'same-origin',
              'sec-fetch-mode': 'cors',
              'sec-fetch-dest': 'empty',
              'referer': 'https://www.filmmakers.co.kr/locations/21206554/edit',
              'accept-encoding': 'gzip, deflate, br, zstd',
              'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
              'priority': 'u=1, i',
              'Cookie': 'PHPSESSID='+getCookies
            },
            data: querystring.stringify({
              '_filter': 'insert',
              'error_return_url': '/locations/21206554/edit',
              'act': 'procBoardInsertDocument',
              'mid': 'locations',
              'document_srl': '21206554',
              'category_srl': '2348353',
              'title': title,
              'extra_vars1': '홍재욱',
              'extra_vars2': '04796|@|서울 성동구 아차산로11가길 6|@|(서울 성동구 성수동2가 278-33)',
              'extra_vars4': 'taulcontact@gmail.com',
              'extra_vars3': '010|@|3101|@|9551',
              'extra_vars5': 'https://www.aubestudio.co.kr/',
              'allow_comment': 'Y',
              'status': 'PUBLIC',
              'tags': '렌탈스튜디오, 스튜디오, 성수동스튜디오, 공간대여, 촬영, 대형스튜디오, 행사, 팝업',
              '_rx_csrf_token': csrfToken,
              'use_editor': 'Y',
              'use_html': 'Y',
              '_rx_ajax_compat': 'XMLRPC',
              'module': 'board',
              'content': ContentValue
            })
          };
          const response = await axios(options);
        //   res.json({message:response.data})
          return response.data
        return
        } catch (error) {
          console.error('Error:', error);
        }

}

export default {
    getLogin,
    getInfo,
    postEdit
};
