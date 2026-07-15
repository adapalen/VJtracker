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
    
    // Go to homepage
    await page.goto('https://www.vietjetair.com/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Dump text content or button labels to find key elements
    const elements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
        tagName: 'INPUT',
        id: el.id,
        className: el.className,
        placeholder: el.placeholder,
        value: el.value,
        name: el.name
      }));
      
      const buttons = Array.from(document.querySelectorAll('button')).map(el => ({
        tagName: 'BUTTON',
        id: el.id,
        className: el.className,
        innerText: el.innerText
      }));
      
      const divs = Array.from(document.querySelectorAll('div')).map(el => ({
        id: el.id,
        className: el.className,
        innerText: el.innerText ? el.innerText.substring(0, 100) : ''
      })).filter(el => el.innerText.toLowerCase().includes('flight') || el.innerText.toLowerCase().includes('hanoi') || el.innerText.toLowerCase().includes('sgn') || el.innerText.toLowerCase().includes('one-way'));

      return { inputs, buttons, divs: divs.slice(0, 30) };
    });

    console.log("--- INPUTS ---");
    console.log(JSON.stringify(elements.inputs, null, 2));
    
    console.log("--- BUTTONS ---");
    console.log(JSON.stringify(elements.buttons.filter(b => b.innerText.trim().length > 0).slice(0, 20), null, 2));

    console.log("--- DIVS ---");
    console.log(JSON.stringify(elements.divs, null, 2));
    
  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
