const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    console.log("Navigating to Vietjet...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.vietjetair.com/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Accept cookies if present
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) agree.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const datePickerElements = await page.evaluate(() => {
      // Find all elements that look like a date display or have date-related class/text
      const allDivs = Array.from(document.querySelectorAll('div, span, p, input'));
      const matches = allDivs.map(el => {
        const text = el.innerText || '';
        const id = el.id || '';
        const className = el.className || '';
        return {
          tagName: el.tagName,
          id,
          className,
          text: text.substring(0, 100),
          placeholder: el.placeholder || '',
          value: el.value || ''
        };
      }).filter(el => {
        const lowerText = el.text.toLowerCase();
        const lowerClass = el.className.toLowerCase();
        const lowerId = el.id.toLowerCase();
        return (
          lowerText.includes('date') || 
          lowerText.includes('departure') || 
          lowerText.includes('return') ||
          lowerClass.includes('date') ||
          lowerClass.includes('calendar') ||
          lowerId.includes('date') ||
          lowerId.includes('calendar')
        );
      });
      return matches.slice(0, 50);
    });

    console.log("--- DATE / CALENDAR RELATED ELEMENTS ---");
    console.log(JSON.stringify(datePickerElements, null, 2));
    
  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
