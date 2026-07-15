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
    const agreeBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) {
        agree.click();
        return true;
      }
      return false;
    });
    console.log("Cookies accepted:", agreeBtn);
    if (agreeBtn) {
      await new Promise(r => setTimeout(r, 2000));
    }

    const searchPanelHtml = await page.evaluate(() => {
      // Let's find inputs and their container
      const arrival = document.getElementById('arrivalPlaceDesktop');
      if (!arrival) return "No arrivalPlaceDesktop found";
      
      // Let's find the parent search container
      let parent = arrival.parentElement;
      for (let i = 0; i < 5; i++) {
        if (parent && parent.tagName !== 'FORM') {
          parent = parent.parentElement;
        } else {
          break;
        }
      }
      
      if (!parent) parent = arrival.parentElement.parentElement.parentElement;
      
      // Get all inputs inside this container
      const inputs = Array.from(parent.querySelectorAll('input')).map(el => ({
        id: el.id,
        className: el.className,
        placeholder: el.placeholder,
        value: el.value,
        name: el.name,
        type: el.type,
        outerHTML: el.outerHTML
      }));

      // Get all buttons inside this container
      const buttons = Array.from(parent.querySelectorAll('button')).map(el => ({
        className: el.className,
        innerText: el.innerText,
        outerHTML: el.outerHTML
      }));

      return { inputs, buttons, html: parent.innerHTML.substring(0, 1000) };
    });

    console.log("--- SEARCH PANEL ---");
    console.log("Inputs:", JSON.stringify(searchPanelHtml.inputs, null, 2));
    console.log("Buttons:", JSON.stringify(searchPanelHtml.buttons, null, 2));
    
  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
