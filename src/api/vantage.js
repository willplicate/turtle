import config from '../config/config.js';

const VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

async function fetchRSI(symbol, interval = 'daily') {
    const url = `${VANTAGE_BASE_URL}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=14&series_type=close&apikey=${config.apis.vantage.apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Vantage RSI fetch failed', error);
        return null;
    }
}

export default {
    fetchRSI
}
