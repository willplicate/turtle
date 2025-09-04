import config from '../config/config.js';

const POLYGON_BASE_URL = 'https://api.polygon.io';

async function fetchStockPrice(symbol) {
    const url = `${POLYGON_BASE_URL}/v2/last/trade/${symbol}?apikey=${config.apis.polygon.apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.results.p;
    } catch (error) {
        console.error('Polygon stock price fetch failed', error);
        return null;
    }
}

async function fetchOptionChain(symbol, expiry) {
    // Option chain retrieval logic
    // Will implement more detailed logic based on specific needs
}

export default {
    fetchStockPrice,
    fetchOptionChain
}
