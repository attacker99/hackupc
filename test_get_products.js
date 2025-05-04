import { main } from './get_products.js';

async function test() {
  try {
    const result = await main();
    console.log('Test completed successfully:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test(); 