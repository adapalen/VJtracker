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
    
    // Enable response interception/inspection
    page.on('response', async (response) => {
      const url = response.url();
      // Check if it's an API request returning flights
      if (url.includes('flight') || url.includes('search') || url.includes('availability') || url.includes('api')) {
        console.log(`Response URL: ${url} (Status: ${response.status()})`);
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const json = await response.json();
            console.log("--- FOUND JSON API RESPONSE ---");
            console.log(JSON.stringify(json, null, 2).substring(0, 1000));
          }
        } catch (e) {
          // ignore parsing error for non-json
        }
      }
    });

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
    console.log("Selecting Origin HAN...");
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.click(originSelector);
    await new Promise(r => setTimeout(r, 500));
    await page.type(originSelector, 'HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      const opt = divs.find(d => d.innerText && d.innerText.includes('Hanoi') && d.innerText.includes('HAN'));
      if (opt) opt.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Select Destination SGN
    console.log("Selecting Destination SGN...");
    await page.click('#arrivalPlaceDesktop');
    await new Promise(r => setTimeout(r, 500));
    await page.type('#arrivalPlaceDesktop', 'SGN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      const opt = divs.find(d => d.innerText && d.innerText.includes('Ho Chi Minh') && d.innerText.includes('SGN'));
      if (opt) opt.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Open date picker
    console.log("Opening calendar...");
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, p, span'));
      const deptDateEl = divs.find(d => d.innerText === 'Departure date');
      if (deptDateEl) deptDateEl.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Click Departure date: July 22, 2026
    console.log("Selecting July 22, 2026...");
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
        return num && num.innerText.trim() === '22';
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
    console.log("Waiting for search results page to load...");
    // Let's wait for navigation or some selector on the search page
    await new Promise(r => setTimeout(r, 10000)); // wait 10s to see what loads
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '10_search_results.png') });
    console.log("Screenshot 10 saved.");

    // Let's dump some results text
    const resultsText = await page.evaluate(() => {
      const body = document.body;
      return body.innerText ? body.innerText.substring(0, 1000) : 'No body text';
    });
    console.log("Search results snippet:");
    console.log(resultsText);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
