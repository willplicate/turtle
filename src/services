import PolygonAPI from '../api/polygon.js';
import VantageAPI from '../api/vantage.js';

async function calculateMarketState(symbol) {
    const price = await PolygonAPI.fetchStockPrice(symbol);
    const rsiData = await VantageAPI.fetchRSI(symbol);

    // Basic market state logic
    const rsi = parseFloat(rsiData.rsi);
    
    if (rsi > 70) return 'OVERBOUGHT';
    if (rsi < 30) return 'OVERSOLD';
    if (rsi >= 40 && rsi <= 60) return 'NEUTRAL';
    
    return price > 0 ? 'BULLISH' : 'BEARISH';
}

export default {
    calculateMarketState
}
