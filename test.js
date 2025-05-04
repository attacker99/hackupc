import axios from 'axios';
import qs from 'qs';
import OpenAI from 'openai';
import {
  OAUTH2_CLIENT,
  OAUTH2_SECRET,
  OAUTH2_SCOPE,
  OAUTH2_ACCESSTOKEN_URL,
  PRODUCT_SEARCH_URL,
  OPENAI_API_KEY
} from './credentials.js';
import { main } from './get_products.js';

const data = qs.stringify({
  grant_type: 'client_credentials',
  scope: OAUTH2_SCOPE
});

async function getJWT() {
  try {
    const response = await axios.post(OAUTH2_ACCESSTOKEN_URL, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'OpenPlatform/1.0',
      },
      auth: {
        username: OAUTH2_CLIENT,
        password: OAUTH2_SECRET,
      }
    });

    const JWT_TOKEN = response.data.id_token;
    console.log('JWT Token:', JWT_TOKEN);
    return JWT_TOKEN;
  } catch (error) {
    console.error('Token request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function searchProducts(item, JWT_TOKEN) {
  try {
    // Extract brand and search query
    const brand = item.toLowerCase().includes('zara') ? 'zara' : 
                 item.toLowerCase().includes('massimo duti') ? 'massimo duti' : 
                 item.toLowerCase().includes('pull & bear') ? 'pull & bear' : 'zara';
    
    // Remove brand name from search query
    const searchQuery = item.replace(/zara|massimo duti|pull & bear/gi, '').trim();
    
    const searchUrl = `https://api.inditex.com/searchpmpa/products?query=${encodeURIComponent(searchQuery)}&brand=${encodeURIComponent(brand)}`;
    
    const searchResponse = await axios({
      method: 'get',
      url: searchUrl,
      headers: {
        'User-Agent': 'OpenPlatform/1.0',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    if (searchResponse.data && searchResponse.data.length > 0) {
      const firstResult = searchResponse.data[0];
      return {
        name: firstResult.name,
        price: firstResult.price,
        link: firstResult.link,
        brand: firstResult.brand
      };
    } else {
      return { error: 'No results found' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function getOutfitSuggestion(product_name, brandsString, openai) {
  const query = "suggest one casual outfit from brands " + brandsString + " with " + product_name + " as the main item, brand Zara. Do not output anything else besides the result, which is in the format \"[first item in the fit, second item in the fit, 3rd item in the fit, ...]\", for example: [\"ZW COLLECTION CROP POPLIN SHIRT\", \"Zara white blouse\", \"Zara black shoes\"]";
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: query }
      ],
      temperature: 0.7,
    });

    console.log(`\nOutfit suggestion for ${product_name}:`);
    const outfitSuggestion = JSON.parse(completion.choices[0].message.content);
    console.log(outfitSuggestion);
    return outfitSuggestion;
  } catch (error) {
    console.error(`Error getting outfit suggestion for ${product_name}:`, error.message);
    throw error;
  }
}

async function test() {
  try {
    const result = await main();
    console.log('Test completed successfully:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

const testImageUrl = "https://classicfella.com/cdn/shop/files/TShirt_White_Trans_0.5x_8537c1fa-10c5-4246-b7fb-55ff5b3a9eb1.png";

async function testProcessImage() {
  try {
    console.log('Testing /api/process-image endpoint with image URL:', testImageUrl);
    const response = await axios.post('http://localhost:3001/api/process-image', {
      imageUrl: testImageUrl
    });
    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

test();
testProcessImage();

