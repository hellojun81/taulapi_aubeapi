import axios from 'axios';
import querystring from 'querystring';
import FormData from 'form-data';
// import { JSDOM } from 'jsdom';
import { parseDocument } from 'htmlparser2';
import { selectOne } from 'css-select';

const getInfo = async (cookie) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://www.filmmakers.co.kr/locationBank/21206554/edit',
            headers: {
                'Cookie': cookie
            }
        };
        console.log({'getInfo cookie':cookie,
            'options':options
        })
        const response = await axios(options);
        const html = response.data;
        const document = parseDocument(html);

        const metaContentValue = selectOne('input[type="hidden"][name="content"]', document);
        const ContentValue = metaContentValue?.attribs?.value;

        const inputElement = selectOne('input[type="text"][name="title"]', document);
        const title = inputElement?.attribs?.value;


        // console.log({ ContentValue: ContentValue, title: title })
        return { ContentValue: ContentValue, title: title }
    } catch (error) {
        console.error('getInfo Error:', error);
    }
}


const getLogin = async () => {
    try {
        const data = querystring.stringify({
            'error_return_url': '/',
            'mid': 'index',
            'ruleset': '@login',
            'act': 'procMemberLogin',
            'success_return_url': '/',
            'xe_validator_id': 'widgets/login_info/skins/default/login_form/1',
            'user_id': 'taulcontact',
            'password': 'h23585858!'
        });

        const options = {
            method: 'POST',
            url: 'https://www.filmmakers.co.kr/index.php?act=procMemberLogin',
            headers: {
                // 'Content-length':new Date().toUTCString(),
                'Host': 'www.filmmakers.co.kr',
                'origin': 'https://www.filmmakers.co.kr',
                'Content-Type': 'application/x-www-form-urlencoded',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                // 'Cookie':'PHPSESSID=285tpfisnricnegtpsqqn8f75h; rx_login_status=0hdZNQ5BpjWObrRraaYzy_la'
            },
            params: {
                'act': 'procMemberLogin' // URL 쿼리 파라미터에 추가할 값
            },
            data: data,
        };

        const response = await axios(options);
        const html = response.data;
        const setCookies = response.headers['set-cookie'];

        // 쿠키 값을 저장할 객체 초기화
        const cookies = {
            PHPSESSID: null,
            rx_login_status: null,
        };

        // 각 쿠키에서 PHPSESSID와 rx_login_status 값 추출
        setCookies.forEach(cookie => {
            if (cookie.startsWith('PHPSESSID=')) {
                cookies.PHPSESSID = cookie.split(';')[0].split('=')[1];
            } else if (cookie.startsWith('rx_login_status=')) {
                cookies.rx_login_status = cookie.split(';')[0].split('=')[1];
            }
        });

        console.log('PHPSESSID:', cookies.PHPSESSID);
        console.log('rx_login_status:', cookies.rx_login_status);
        const getcookie = 'PHPSESSID=' + cookies.PHPSESSID + '; rx_login_status=' + cookies.rx_login_status
        return getcookie;
    } catch (error) {
        console.error('Login error:', error);
        return 'Login error:' + error;
    }
};

const getCrsfToken = async (cookie) => {
    try {

        const options = {
            method: 'Get',
            url: 'https://www.filmmakers.co.kr/',
            headers: {
                'Host': 'www.filmmakers.co.kr',
                'origin': 'https://www.filmmakers.co.kr',
                'Content-Type': 'application/x-www-form-urlencoded',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                'Cookie': cookie
            },
        };

        const response = await axios(options);
        const html = response.data;
        const document = parseDocument(html);
        // console.log('getCrsfToken',html)
        const metaTag = selectOne('meta[name="csrf-token"]', document);
        const csrfToken = metaTag?.attribs?.content;
        return csrfToken;
    } catch (error) {
        console.error('getCrsfToken error:', error);
        return 'getCrsfToken error:' + error;
    }
}

const postEdit = async () => {
    
    const now = new Date(); // 현재 시간
    const minute = now.getMinutes(); // 분 단위
    // if (minute % 2 === 0) { await postEditThumbnail() } 

    const getCookie = await getLogin()
    const CrsfToken = await getCrsfToken(getCookie)
    const getInfoVaule = await getInfo(getCookie)
    const ContentValue = getInfoVaule.ContentValue
    const title = getInfoVaule.title

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
    comment_status: "ALLOW",
    status: "PUBLIC",
    _rx_csrf_token: "su03jMElkaRDhVvp",
    module: "board",
    act: "procBoardInsertDocument",
    _rx_ajax_compat: "XMLRPC"
    };

    let ContentChg = ContentValue.replace(/'/g, '');
    ContentChg = ContentChg.replace(new RegExp('\n +', 'g'), '')

    try {
        const options = {
            method: 'POST',
            url: 'https://www.filmmakers.co.kr/',
            headers: {
                'authority': 'www.filmmakers.co.kr',
                'scheme': 'https',
                'path': '/',
                // 'content-length': '3000',
                'sec-ch-ua-platform': '"macOS"',
                'x-csrf-token': CrsfToken,
                'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'x-requested-with': 'XMLHttpRequest',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'origin': 'https://www.filmmakers.co.kr',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://www.filmmakers.co.kr/locationBank/21206554/edit',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'priority': 'u=1, i',
                'Cookie': getCookie
            },
            data: querystring.stringify(formData),
            timeout: 20000
        };
        // console.log('options', options)여기서 에러 발생하는듯 https://www.filmmakers.co.kr/locationBank/21206554/edit
        const response = await axios(options);

        // console.log('reponse', response.data.message)
        // res.json({ message: response.data })
        console.log(response.data)
        return response.data

    } catch (error) {
        console.error('postEdit Error:', error);
        return 'postEdit Error:' + error
    }

}

const postEditThumbnail = async () => {

    const getCookie = await getLogin()
    const CrsfToken = await getCrsfToken(getCookie)
    const getInfoVaule = await getInfo(getCookie)
    const ContentValue = getInfoVaule.ContentValue
    const title = getInfoVaule.title

    // console.log({ 'getCookie': getCookie, 'CrsfToken': CrsfToken, title: title, ContentValue: ContentValue })
    let ContentChg = ContentValue.replace(/'/g, '');
    ContentChg = ContentChg.replace(new RegExp('\n +', 'g'), '')
    //24993914,22814417,22814428,22814444,22814467,24758808,22814454,22814430,24873205
    const file_srl = [24993914, 22814417, 22814428, 22814444, 22814467, 24758808, 22814454, 22814430, 24873205];
    const randomOne = file_srl[Math.floor(Math.random() * file_srl.length)];


    const formData = {
        file_srl: randomOne,
        mid: 'locationBank',
        editor_sequence: '21206554',
        module: 'file',
        act: 'procFileSetCoverImage',
    };
    try {
        const options = {
            method: 'POST',
            url: 'https://www.filmmakers.co.kr/',
            headers: {
                'authority': 'www.filmmakers.co.kr',
                'scheme': 'https',
                'path': '/',
                // 'content-length': '3000',
                'sec-ch-ua-platform': '"macOS"',
                'x-csrf-token': CrsfToken,
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
                'referer': 'https://www.filmmakers.co.kr/locationBank/21206554/edit',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'priority': 'u=1, i',
                'Cookie': getCookie
            },
            data: querystring.stringify(formData),
            timeout: 20000
        };
        const response = await axios(options);
        console.log({response_data:response.data})
        return response.data
    } catch (error) {
        console.error('postEditThumbnail Error:', error);
        return 'postEditThumbnail Error:' + error
    }
}


export default {
    getLogin,
    getInfo,
    postEdit,
    postEditThumbnail
};


