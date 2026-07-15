const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Vietjet...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
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
    console.log("Typing Origin HAN...");
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.click(originSelector);
    await new Promise(r => setTimeout(r, 500));
    await page.type(originSelector, 'HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    
    // Click HAN row
    const originClicked = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const row = divs.find(d => d.innerText && d.innerText.includes('HAN') && d.innerText.includes('Ha Noi') && d.innerText.includes('Airport') && d.className.includes('MuiBox-root'));
      if (row) {
        ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
          row.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });
        return true;
      }
      return false;
    });
    console.log("Origin clicked:", originClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Type Destination SGN
    console.log("Typing Destination SGN...");
    await page.click('#arrivalPlaceDesktop');
    await new Promise(r => setTimeout(r, 500));
    await page.type('#arrivalPlaceDesktop', 'SGN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));

    // Click SGN row
    const destClicked = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const row = divs.find(d => d.innerText && d.innerText.includes('SGN') && d.innerText.includes('Ho Chi Minh') && d.innerText.includes('Airport') && d.className.includes('MuiBox-root'));
      if (row) {
        ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
          row.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
        });
        return true;
      }
      return false;
    });
    console.log("Destination clicked:", destClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Click Departure date: July 25, 2026
    console.log("Selecting July 25, 2026...");
    const dateClicked = await page.evaluate(() => {
      const months = Array.from(document.querySelectorAll('.rdrMonth'));
      const julyMonth = months.find(m => {
        const name = m.querySelector('.rdrMonthName');
        return name && name.innerText.includes('July 2026');
      });
      if (!julyMonth) return false;
      const dayButtons = Array.from(julyMonth.querySelectorAll('.rdrDay'));
      const active = dayButtons.filter(b => !b.className.includes('rdrDayPassive'));
      const target = active.find(b => {
        const num = b.querySelector('.rdrDayNumber');
        return num && num.innerText.trim() === '25';
      });
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    console.log("Date selected:", dateClicked);
    await new Promise(r => setTimeout(r, 1000));

    // Click Search "Let's go"
    console.log("Clicking Search...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Let's go"));
      if (btn) btn.click();
    });
    
    // Wait for search results
    console.log("Waiting for search results page...");
    // Let's wait 15 seconds to be sure
    await new Promise(r => setTimeout(r, 15000));
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '16_results.png') });
    console.log("Screenshot 16 saved.");

    const title = await page.title();
    console.log("Results Page Title:", title);
    
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
