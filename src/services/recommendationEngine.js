import MarketAnalysis from './marketAnalysis.js';
import PolygonAPI from '../api/polygon.js';

class RecommendationEngine {
    async getStrikeRecommendation(symbol, currentPrice) {
        const marketState = await MarketAnalysis.calculateMarketState(symbol);
        const rsi = await MarketAnalysis.fetchRSI(symbol);

        const strategies = {
            'STRONG_BULL': this.strongBullStrategy(rsi, currentPrice),
            'BULL': this.bullStrategy(rsi, currentPrice),
            'NEUTRAL': this.neutralStrategy(rsi, currentPrice),
            'WEAK': this.weakStrategy(rsi, currentPrice),
            'CORRECTION': this.correctionStrategy(rsi, currentPrice)
        };

        return strategies[marketState] || this.defaultStrategy(currentPrice);
    }

    strongBullStrategy(rsi, currentPrice) {
        if (rsi > 70) return { type: 'ITM', strikes: 1, rationale: 'Overbought protection' };
        return { type: 'ATM', strikes: 0, rationale: 'Maximum extrinsic value' };
    }

    bullStrategy(rsi, currentPrice) {
        if (rsi > 70) return { type: 'ITM', strikes: 2, rationale: 'Extended market protection' };
        if (rsi < 40) return { type: 'ATM', strikes: 0, rationale: 'Oversold bounce potential' };
        return { type: 'ITM', strikes: 1, rationale: 'Balanced approach' };
    }

    neutralStrategy(rsi, currentPrice) {
        if (rsi > 65) return { type: 'ITM', strikes: 2, rationale: 'Defensive positioning' };
        if (rsi < 35) return { type: 'ATM', strikes: 0, rationale: 'Potential reversal' };
        return { type: 'ITM', strikes: 1, rationale: 'Conservative neutral stance' };
    }

    weakStrategy(rsi, currentPrice) {
        return { type: 'ITM', strikes: 3, rationale: 'Maximum protection in weak market' };
    }

    correctionStrategy(rsi, currentPrice) {
        return { type: 'ITM', strikes: 3, rationale: 'Extreme market protection' };
    }

    defaultStrategy(currentPrice) {
        return { type: 'ITM', strikes: 2, rationale: 'Conservative default approach' };
    }
}

export default new RecommendationEngine();
