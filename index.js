// Remove these imports since they'll be passed from the HTML
// import axios from 'axios';
// import qs from 'qs';
// import OpenAI from 'openai';

// Get the qs module from the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const qs = JSON.parse(decodeURIComponent(urlParams.get('qs')));

// Import credentials
import {
  OAUTH2_CLIENT,
  OAUTH2_SECRET,
  OAUTH2_SCOPE,
  OAUTH2_ACCESSTOKEN_URL,
  PRODUCT_SEARCH_URL,
  OPENAI_API_KEY
} from './credentials.js';

async function getJWT(deps) {
  try {
    const data = deps.qs.stringify({
      grant_type: 'client_credentials',
      scope: OAUTH2_SCOPE
    });

    console.log('Making JWT request with data:', data);
    const response = await deps.axios.post(OAUTH2_ACCESSTOKEN_URL, data, {
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
    console.log('JWT Token obtained successfully');
    return JWT_TOKEN;
  } catch (error) {
    console.error('Token request failed:', error.response?.data || error.message);
    throw new Error(`Failed to get JWT token: ${error.message}`);
  }
}

async function searchProducts(item, JWT_TOKEN, deps) {
  try {
    console.log('Searching for product:', item);
    // Extract brand and search query
    const brand = item.toLowerCase().includes('zara') ? 'zara' : 
                 item.toLowerCase().includes('massimo duti') ? 'massimo duti' : 
                 item.toLowerCase().includes('pull & bear') ? 'pull & bear' : 'zara';
    
    // Remove brand name from search query
    const searchQuery = item.replace(/zara|massimo duti|pull & bear/gi, '').trim();
    
    const searchUrl = `https://api.inditex.com/searchpmpa/products?query=${encodeURIComponent(searchQuery)}&brand=${encodeURIComponent(brand)}`;
    console.log('Search URL:', searchUrl);
    
    const searchResponse = await deps.axios({
      method: 'get',
      url: searchUrl,
      headers: {
        'User-Agent': 'OpenPlatform/1.0',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Search response:', searchResponse.data);

    if (searchResponse.data && searchResponse.data.length > 0) {
      // Get a random index from the array
      const randomIndex = Math.floor(Math.random() * searchResponse.data.length);
      // Return only the randomly selected item as an object
      return {
        name: searchResponse.data[randomIndex].name,
        price: searchResponse.data[randomIndex].price,
        link: searchResponse.data[randomIndex].link,
        brand: searchResponse.data[randomIndex].brand
      };
    } else {
      throw new Error('No results found for the search query');
    }
  } catch (error) {
    console.error('Product search failed:', error.response?.data || error.message);
    throw new Error(`Failed to search products: ${error.message}`);
  }
}

async function getOutfitSuggestion(product_name, brandsString, deps) {
  try {
    console.log('Getting outfit suggestion for:', product_name);
    const response = await deps.axios.post('http://localhost:3001/api/get-outfit-suggestion', {
      product_name,
      brandsString
    });

    console.log('Outfit suggestion response:', response.data);
    return response.data.outfitSuggestion;
  } catch (error) {
    console.error('Outfit suggestion failed:', error.response?.data || error.message);
    throw new Error(`Failed to get outfit suggestion: ${error.message}`);
  }
}

async function generateOutfitWithProducts(product_names, JWT_TOKEN, deps) {
  try {
    const shortened_product_names = product_names.slice(0, 1);
    console.log("Processing first product:", shortened_product_names);

    const brands = ["Zara"];
    const brandsString = brands.join(", ");
    
    for (const product_name of shortened_product_names) {
      const outfitSuggestion = await getOutfitSuggestion(product_name, brandsString, deps);
      console.log('Outfit suggestion received:', outfitSuggestion);

      // Search for each item in the outfit
      const searchPromises = outfitSuggestion.map(item => searchProducts(item, JWT_TOKEN, deps));
      const searchResults = await Promise.all(searchPromises);
      
      console.log('Search results:', searchResults);
      
      return {
        mainItem: product_name,
        outfitSuggestion: outfitSuggestion,
        products: searchResults
      };
    }
  } catch (error) {
    console.error('Outfit generation failed:', error);
    throw new Error(`Failed to generate outfit: ${error.message}`);
  }
}

async function main(imageUrl, deps) {
  try {
    console.log('Starting main process with image URL:', imageUrl);
    
    // Call our server endpoint to process the image and get the outfit
    const response = await deps.axios.post('http://localhost:3001/api/process-image', {
      imageUrl
    });

    console.log('Server response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error in main process:", error);
    throw new Error(`Main process failed: ${error.message}`);
  }
}

// Export the main function for use in other files
export { main };

