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
    
    // Close modal
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, button, span, p'));
      const later = divs.find(d => d.innerText === 'Later');
      if (later) later.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Select One-Way
    console.log("Selecting One-Way...");
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="radio"]'));
      const oneway = inputs.find(i => i.value === 'oneway');
      if (oneway) {
        oneway.click();
        oneway.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Select Origin HAN
    console.log("Selecting Origin HAN...");
    // Let's find inputs. The first text input is Origin
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs.length > 0) {
        inputs[0].click();
      }
    });
    await new Promise(r => setTimeout(r, 500));
    // Let's type HAN
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs.length > 0) {
        inputs[0].focus();
        inputs[0].value = '';
      }
    });
    // We can type using keyboard or type
    // Since inputs[0] is active, we type 'HAN'
    await page.keyboard.type('HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));

    // Click the HAN row
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const row = divs.find(d => d.innerText && d.innerText.includes('HAN') && d.innerText.includes('Ha Noi') && d.innerText.includes('Airport') && d.className.includes('MuiBox-root'));
      if (row) {
        ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
          row.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Select Destination SGN
    console.log("Selecting Destination SGN...");
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs.length > 1) {
        inputs[1].click();
      }
    });
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.type('SGN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));

    // Click the SGN row
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const row = divs.find(d => d.innerText && d.innerText.includes('SGN') && d.innerText.includes('Ho Chi Minh') && d.innerText.includes('Airport') && d.className.includes('MuiBox-root'));
      if (row) {
        ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
          row.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Select Date: July 20, 2026
    console.log("Selecting Date July 20, 2026...");
    await page.evaluate(() => {
      const months = Array.from(document.querySelectorAll('.rdrMonth'));
      const targetMonth = months.find(m => {
        const name = m.querySelector('.rdrMonthName');
        return name && name.innerText.includes('July 2026');
      });
      if (!targetMonth) return;
      const dayButtons = Array.from(targetMonth.querySelectorAll('.rdrDay'));
      const active = dayButtons.filter(b => !b.className.includes('rdrDayPassive'));
      const target = active.find(b => {
        const num = b.querySelector('.rdrDayNumber');
        return num && num.innerText.trim() === '20';
      });
      if (target) {
        ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
          target.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Click Search "LET'S GO"
    console.log("Clicking Search...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("LET'S GO"));
      if (btn) btn.click();
    });
    
    // Wait for search results
    console.log("Waiting for search results...");
    await new Promise(r => setTimeout(r, 20000));
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '24_mobile_results.png') });
    console.log("Screenshot 24 saved.");

    const resultsSnippet = await page.evaluate(() => {
      return document.body.innerText ? document.body.innerText.substring(0, 1500) : 'No text';
    });
    console.log("Results snippet:");
    console.log(resultsSnippet);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
