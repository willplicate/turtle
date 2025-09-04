import MarketAnalysis from './marketAnalysis.js';

async function recommendStrike(symbol, currentPrice) {
    const marketState = await MarketAnalysis.calculateMarketState(symbol);
    
    const recommendations = {
        'OVERBOUGHT': {
            type: 'ITM',
            strikes: 1,
            description: 'Protective strike due to overbought conditions'
        },
        'OVERSOLD': {
            type: 'ATM',
            strikes: 0,
            description: 'Opportunistic strike for potential market bounce'
        },
        'NEUTRAL': {
            type: 'ITM',
            strikes: 1,
            description: 'Balanced approach during neutral market'
        },
        'BULLISH': {
            type: 'ATM',
            strikes: 0,
            description: 'Capture maximum extrinsic value in bullish market'
        },
        'BEARISH': {
            type: 'ITM',
            strikes: 2,
            description: 'Conservative strike in bearish market'
        }
    };

    return recommendations[marketState];
}

export default {
    recommendStrike
}
