const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\thanh\\.gemini\\antigravity\\brain\\abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Vietjet...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto('https://www.vietjetair.com/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_homepage.png') });
    console.log("Screenshot 1 saved.");
    
    // Accept cookies if present
    const accepted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) {
        agree.click();
        return true;
      }
      return false;
    });
    console.log("Cookies accepted:", accepted);
    if (accepted) {
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Select One-Way
    console.log("Selecting One-Way...");
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="radio"]'));
      const oneway = inputs.find(i => i.value === 'oneway');
      if (oneway) {
        // Find parent label or click it directly
        oneway.click();
        // Trigger change event if needed
        oneway.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_oneway_selected.png') });
    console.log("Screenshot 2 saved.");
    
    // Click Origin
    console.log("Clicking Origin input...");
    await page.evaluate(() => {
      const originInput = document.querySelector('input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input');
      if (originInput) {
        originInput.focus();
        originInput.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_origin_clicked.png') });
    console.log("Screenshot 3 saved.");

    // Type Origin "Hanoi"
    console.log("Typing 'Hanoi' in Origin input...");
    // Let's find the selector for the origin input
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.type(originSelector, 'Hanoi');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_origin_typed.png') });
    console.log("Screenshot 4 saved.");

    // Let's see suggestion list
    const suggestions = await page.evaluate(() => {
      // Find all divs or elements with dropdown/list contents
      const divs = Array.from(document.querySelectorAll('div, li, span'));
      return divs.map(d => d.innerText || '').filter(t => t.includes('Hanoi') || t.includes('HAN')).slice(0, 10);
    });
    console.log("Suggestions found for Origin:", suggestions);

    // Let's click the option containing HAN or Hanoi
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      // Find the one that says Hanoi (HAN) or similar
      const hanoiOpt = divs.find(d => d.innerText && d.innerText.includes('Hanoi') && d.innerText.includes('HAN'));
      if (hanoiOpt) {
        hanoiOpt.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_origin_selected.png') });
    console.log("Screenshot 5 saved.");

    // Type Destination "SGN"
    console.log("Typing 'Ho Chi Minh' in Destination input...");
    await page.type('#arrivalPlaceDesktop', 'Ho Chi Minh');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_dest_typed.png') });
    console.log("Screenshot 6 saved.");

    // Click suggestion for SGN
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      const sgnOpt = divs.find(d => d.innerText && d.innerText.includes('Ho Chi Minh') && d.innerText.includes('SGN'));
      if (sgnOpt) {
        sgnOpt.click();
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_dest_selected.png') });
    console.log("Screenshot 7 saved.");

    // Click Departure date picker
    console.log("Opening Departure date picker...");
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, p, span'));
      const deptDateEl = divs.find(d => d.innerText === 'Departure date');
      if (deptDateEl) {
        deptDateEl.click();
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_calendar_opened.png') });
    console.log("Screenshot 8 saved.");

    // Let's dump calendar html structures
    const calendarElements = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, button, span'));
      // Find calendar container, typically class name has datepicker, calendar, popover or dialog
      return allDivs.map(d => ({
        tagName: d.tagName,
        className: d.className,
        innerText: d.innerText ? d.innerText.substring(0, 100) : ''
      })).filter(d => d.className.toLowerCase().includes('calendar') || d.innerText.includes('July 2026') || d.innerText.includes('August 2026') || d.innerText.includes('2026'));
    });
    console.log("Calendar elements:", calendarElements.slice(0, 30));

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
