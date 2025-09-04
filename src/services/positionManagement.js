import SupabaseAPI from '../api/supabase.js';
import RecommendationEngine from './recommendationEngine.js';
import TradeLogger from './tradeLogging.js';
import PolygonAPI from '../api/polygon.js';

class PositionManager {
    async rollLeapsPosition(currentPosition) {
        const currentPrice = await PolygonAPI.fetchStockPrice(currentPosition.symbol);
        const recommendation = await RecommendationEngine.getStrikeRecommendation(
            currentPosition.symbol, 
            currentPrice
        );

        const newLeapsPosition = {
            symbol: currentPosition.symbol,
            leaps_strike: this.calculateNewStrike(currentPrice, recommendation),
            leaps_expiry: this.calculateNewExpiry(),
            leaps_cost_basis: this.estimateCostBasis(currentPrice),
            current_delta: this.calculateDelta(currentPrice)
        };

        await SupabaseAPI.updatePosition(currentPosition.id, newLeapsPosition);
        await TradeLogger.logRoll(currentPosition, newLeapsPosition);

        return newLeapsPosition;
    }

    calculateNewStrike(currentPrice, recommendation) {
        const strikeAdjustment = {
            'ITM': -5,
            'ATM': 0,
            'OTM': 5
        };
        return currentPrice + (strikeAdjustment[recommendation.type] * recommendation.strikes);
    }

    calculateNewExpiry() {
        const today = new Date();
        const newExpiry = new Date(today.setMonth(today.getMonth() + 4));
        return newExpiry.toISOString().split('T')[0];
    }

    estimateCostBasis(currentPrice) {
        return currentPrice * 100; // Rough estimation
    }

    calculateDelta(currentPrice) {
        // Simplified delta calculation
        return Math.min(0.80, Math.max(0.60, currentPrice / 600 * 100));
    }
}

export default new PositionManager();
