import { chromium } from 'playwright';

async function getProductImage(url, productDescription) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-gpu',
      '--disable-extensions',
      '--disable-infobars',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--force-color-profile=srgb',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Find the image with matching alt text
    const imageUrl = await page.evaluate((description) => {
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (img.alt && img.alt.includes(description)) {
          return img.src;
        }
      }
      return null;
    }, productDescription);

    if (!imageUrl) {
      console.log('No image found with the given description');
    } else {
      console.log('Found image URL:', imageUrl);
    }

    return imageUrl;
  } catch (error) {
    console.error('Error occurred:', error.message);
    return null;
  } finally {
    await browser.close();
  }
}

// Example usage
getProductImage('https://zara.com/es/en/-P15013530.html?v1=420872847', 'STRIPED BAREFOOT PLIMSOLLS'); 