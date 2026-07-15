const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching mobile stealth browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { 
      width: 390, 
      height: 844, 
      isMobile: true, 
      hasTouch: true 
    }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Vietjet...");
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1");
    await page.goto('https://www.vietjetair.com/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Accept cookies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) agree.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Close modal if exists
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, button, span, p'));
      const later = divs.find(d => d.innerText === 'Later');
      if (later) later.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '23_mobile_homepage.png') });
    console.log("Screenshot 23 saved.");

    // Dump inputs on mobile
    const elements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
        tagName: 'INPUT',
        id: el.id,
        className: el.className,
        placeholder: el.placeholder,
        value: el.value,
        name: el.name,
        type: el.type
      }));
      
      const buttons = Array.from(document.querySelectorAll('button')).map(el => ({
        tagName: 'BUTTON',
        className: el.className,
        innerText: el.innerText
      }));
      
      return { inputs, buttons };
    });

    console.log("--- MOBILE INPUTS ---");
    console.log(JSON.stringify(elements.inputs, null, 2));
    console.log("--- MOBILE BUTTONS ---");
    console.log(JSON.stringify(elements.buttons.filter(b => b.innerText.trim().length > 0).slice(0, 20), null, 2));

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
