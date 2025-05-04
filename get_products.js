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

async function main() {
  try {
    // Get JWT token
    const JWT_TOKEN = await getJWT();
    console.log('JWT token obtained');

    // Hardcoded image URL
    const imageUrl = "https://classicfella.com/cdn/shop/files/TShirt_White_Trans_0.5x_8537c1fa-10c5-4246-b7fb-55ff5b3a9eb1.png";
    console.log('Using image URL:', imageUrl);

    // Process image with API
    const url = `${PRODUCT_SEARCH_URL}?image=${encodeURIComponent(imageUrl)}`;
    const response = await axios({
      method: 'get',
      url: url,
      headers: {
        'User-Agent': 'OpenPlatform/1.0',
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Product search results:', response.data);
    const productData = response.data;
    console.log('Product data obtained:', productData);

    // Generate outfit suggestions
    let product_names;
    if (productData && productData.length > 0) {
      product_names = productData.map(product => product.name);
    } else {
      // Default product name if image search returns no results
      product_names = ["White T-Shirt"];
    }
    const shortened_product_names = product_names.slice(0, 1);
    console.log("First product:", shortened_product_names);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY
    });

    // Massimo Duti, Pull & Bear and Zara
    const brands = ["Zara"];
    const brandsString = brands.join(", ");
    
    for (const product_name of shortened_product_names) {
      try {
        const outfitSuggestion = await getOutfitSuggestion(product_name, brandsString, openai);

        // Search for each item in the outfit
        const searchPromises = outfitSuggestion.map(item => searchProducts(item, JWT_TOKEN));

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);
        
        // Print all search results
        console.log("\nAll search results:");
        searchResults.forEach((result, index) => {
          console.log(`\nResult for "${outfitSuggestion[index]}":`);
          console.log(JSON.stringify(result, null, 2));
        });
        
        // Create the final outfit suggestion with product details
        const outfitWithProducts = {
          mainItem: product_name,
          outfitSuggestion: outfitSuggestion,
          products: searchResults
        };

        console.log(JSON.stringify(outfitWithProducts, null, 2));
        return outfitWithProducts;
      } catch (error) {
        console.error(`Error processing outfit for ${product_name}:`, error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in main process:", error.message);
    throw error;
  }
}

// Export the main function for use in other files
export { main };

