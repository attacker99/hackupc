import express from 'express';
import cors from 'cors';
import axios from 'axios';
import qs from 'qs';
import { OpenAI } from 'openai';
import {
  OAUTH2_CLIENT,
  OAUTH2_SECRET,
  OAUTH2_SCOPE,
  OAUTH2_ACCESSTOKEN_URL,
  PRODUCT_SEARCH_URL,
  OPENAI_API_KEY
} from './credentials.js';

const app = express();

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies with increased limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('.'));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Function to get JWT token
async function getJWT() {
  try {
    const data = qs.stringify({
      grant_type: 'client_credentials',
      scope: OAUTH2_SCOPE
    });

    console.log('Making JWT request with data:', data);
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
    console.log('JWT Token obtained successfully');
    return JWT_TOKEN;
  } catch (error) {
    console.error('Token request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Function to search products
async function searchProducts(item, JWT_TOKEN) {
  try {
    console.log('Searching for product:', item);
    const brand = item.toLowerCase().includes('zara') ? 'zara' : 
                 item.toLowerCase().includes('massimo duti') ? 'massimo duti' : 
                 item.toLowerCase().includes('pull & bear') ? 'pull & bear' : 'zara';
    
    const searchQuery = item.replace(/zara|massimo duti|pull & bear/gi, '').trim();
    const searchUrl = `https://api.inditex.com/searchpmpa/products?query=${encodeURIComponent(searchQuery)}&brand=${encodeURIComponent(brand)}`;
    console.log('Search URL:', searchUrl);
    
    const searchResponse = await axios({
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
      const randomIndex = Math.floor(Math.random() * searchResponse.data.length);
      return {
        name: searchResponse.data[randomIndex].name,
        price: searchResponse.data[randomIndex].price,
        link: searchResponse.data[randomIndex].link,
        brand: searchResponse.data[randomIndex].brand
      };
    } else {
      console.log('No results found for:', item);
      return {
        name: 'Product not found',
        price: { currency: 'EUR', value: { current: 0 } },
        link: '#',
        brand: brand
      };
    }
  } catch (error) {
    console.error('Product search failed:', error.response?.data || error.message);
    return {
      name: 'Error finding product',
      price: { currency: 'EUR', value: { current: 0 } },
      link: '#',
      brand: 'unknown',
      error: error.message
    };
  }
}

// Endpoint for outfit suggestions
app.post('/api/get-outfit-suggestion', async (req, res) => {
  try {
    const { product_name, brandsString } = req.body;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a fashion expert. Create a complete outfit suggestion based on the given product. 
                   The outfit should include 3-4 items that complement the main product.
                   Only suggest items from these brands: ${brandsString}.
                   Return the items as a JSON array of strings.`
        },
        {
          role: "user",
          content: `Suggest a complete outfit for this product: ${product_name}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const outfitSuggestion = JSON.parse(completion.choices[0].message.content).outfit;
    res.json({ outfitSuggestion });
  } catch (error) {
    console.error('Error getting outfit suggestion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for processing images and getting products
app.post('/api/process-image', async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      console.error('No imageUrl provided in request');
      return res.status(400).json({ error: 'No imageUrl provided' });
    }

    console.log('Processing image URL:', imageUrl);
    
    // Get JWT token
    const JWT_TOKEN = await getJWT();
    console.log('JWT token obtained');
    
    // Process image with API
    const url = `${PRODUCT_SEARCH_URL}?image=${encodeURIComponent(imageUrl)}`;
    console.log('Using image URL:', url);
    
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
    let product_names;
    if (productData && productData.length > 0) {
      product_names = productData.map(product => product.name);
    } else {
      product_names = ["White T-Shirt"];
    }
    console.log('Product data obtained:', productData);
    console.log('First product:', product_names);

    // Get outfit suggestion directly
    const brands = ["Zara"];
    const brandsString = brands.join(", ");
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a fashion expert. Create a complete outfit suggestion based on the given product. 
                     The outfit should include 3-4 items that complement the main product.
                     Only suggest items from these brands: ${brandsString}.
                     Return the items as a JSON array of strings.`
          },
          {
            role: "user",
            content: `Suggest a complete outfit for this product: ${product_names[0]}`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      console.log('OpenAI response:', completion.choices[0].message.content);
      const outfitSuggestion = JSON.parse(completion.choices[0].message.content).outfit;
      console.log('Parsed outfit suggestion:', outfitSuggestion);

      // Search for each item in the outfit
      console.log('Searching for products...');
      const searchPromises = outfitSuggestion.map(item => searchProducts(item, JWT_TOKEN));
      const searchResults = await Promise.all(searchPromises);
      console.log('All search results:', searchResults);

      res.json({
        mainItem: product_names[0],
        outfitSuggestion: outfitSuggestion,
        products: searchResults
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      res.status(500).json({ 
        error: `OpenAI API error: ${openaiError.message}`,
        details: openaiError.response?.data || 'No additional details available'
      });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 