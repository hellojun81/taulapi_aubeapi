
import puppeteer from 'puppeteer';
(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
  
    // Google 페이지로 이동하고 로드가 완료될 때까지 기다리기
    await page.goto('https://nid.naver.com/nidlogin.login?mode=form&url=https://www.naver.com/', { waitUntil: 'domcontentloaded' });
  
    // 검색어 입력란이 로드될 때까지 기다리기
    await page.waitForSelector('input[name="id"]', { visible: true, timeout: 60000 });
  

    // 검색어 입력
    await page.type('input[name="id"]', 'hong10004ok', { delay: 100 }); // 딜레이를 줘서 자연스러운 타이핑 속도로 입력
  
    await new Promise(resolve => setTimeout(resolve, 3000)); // 15초 대기

    await page.type('input[name="pw"]', 'taulcontact!', { delay: 150 });

    await new Promise(resolve => setTimeout(resolve, 3000)); // 15초 대기

    await page.keyboard.press('Enter');

    // 검색 결과가 로드될 때까지 기다리기
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  
    await page.goto('https://cafe.naver.com/locationbank', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000)); // 15초 대기

    await page.waitForSelector('button.gm-tcol-t', { visible: true });
    // await page.click('button.gm-tcol-t');
    const buttons = await page.$$('button.gm-tcol-t');

    await page.evaluate(() => {
        const buttons = document.querySelectorAll('button.gm-tcol-t');
        if (buttons[1]) {
            buttons[1].click();
        }
    });

    // console.log('검색 완료');
    // await browser.close();
  })();
  