const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    const url = 'https://www.google.com/travel/flights?q=Flights%20from%20HAN%20to%20PXU%20on%202026-07-25%20oneway';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Waiting for results...");
    await new Promise(r => setTimeout(r, 10000));
    
    console.log("Inspecting elements containing 'Vietjet'...");
    const elementsInfo = await page.evaluate(() => {
      // Find all elements that contain the word "Vietjet"
      const allElements = Array.from(document.querySelectorAll('*'));
      const matching = allElements.filter(el => {
        // Only elements that directly contain "Vietjet" in their text (not just their children)
        if (!el.innerText || !el.innerText.includes('Vietjet')) return false;
        // Check if it has children that also have "Vietjet" - we want the leaf-most elements or list items
        return el.children.length < 10; 
      });

      return matching.map(el => ({
        tagName: el.tagName,
        className: el.className,
        role: el.getAttribute('role'),
        innerText: el.innerText.substring(0, 100),
        childCount: el.children.length
      })).slice(0, 30);
    });

    console.log("--- MATCHING ELEMENTS ---");
    console.log(JSON.stringify(elementsInfo, null, 2));

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
