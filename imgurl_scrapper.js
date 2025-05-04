import puppeteer from 'puppeteer';

async function getProductImage(productUrl, productDescription) {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport to desktop size
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Loading page:', productUrl);
    await page.goto(productUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(5000);
    
    console.log('Looking for product image...');
    const images = await page.evaluate((description) => {
      const imgs = document.querySelectorAll('img');
      const results = [];
      imgs.forEach(img => {
        results.push({
          alt: img.alt,
          src: img.src
        });
      });
      return results;
    }, productDescription);
    
    console.log('Found images:', images);
    
    await browser.close();
    
    // Find the image with matching description
    const matchingImage = images.find(img => 
      img.alt.toLowerCase() === productDescription.toLowerCase()
    );
    
    if (!matchingImage) {
      throw new Error('Could not find image with matching product description');
    }
    
    return matchingImage.src;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const productUrl = "https://www.zara.com/es/en/-P15013530.html?v1=420872847";
    const productDescription = "STRIPED BAREFOOT PLIMSOLLS";
    const imageUrl = await getProductImage(productUrl, productDescription);
    console.log('Product image URL:', imageUrl);
  } catch (error) {
    console.error('Failed to get product image:', error.message);
  }
}

main();
