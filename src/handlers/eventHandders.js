import PositionManager from '../services/positionManagement.js';
import TradeLogger from '../services/tradeLogging.js';
import RiskManager from '../services/riskManagement.js';
import RecommendationEngine from '../services/recommendationEngine.js';

class EventHandders {
    async handlePositionRoll(positionId) {
        try {
            const position = await PositionManager.fetchPosition(positionId);
            const riskAssessment = await RiskManager.calculatePositionRisk(position);
            
            if (riskAssessment.overallRisk !== 'EXTREME_RISK') {
                const rolledPosition = await PositionManager.rollLeapsPosition(position);
                await TradeLogger.logRoll(position, rolledPosition);
                return rolledPosition;
            }
            
            throw new Error('Position too risky to roll');
        } catch (error) {
            console.error('Position roll failed', error);
            throw error;
        }
    }

    async handleWeeklyCallSale(symbol) {
        try {
            const currentPrice = await PolygonAPI.fetchStockPrice(symbol);
            const recommendation = await RecommendationEngine.getStrikeRecommendation(symbol, currentPrice);
            
            const tradeDetails = {
                symbol,
                strike: recommendation.strike,
                action: 'sell',
                premium: this.calculatePremium(recommendation)
            };

            await TradeLogger.logTrade(tradeDetails);
            return tradeDetails;
        } catch (error) {
            console.error('Weekly call sale failed', error);
            throw error;
        }
    }

    calculatePremium(recommendation) {
        // Implement premium calculation logic
    }

    async handleTradeAdjustment(tradeId, adjustmentDetails) {
        try {
            const updatedTrade = await TradeLogger.updateTrade(tradeId, adjustmentDetails);
            return updatedTrade;
        } catch (error) {
            console.error('Trade adjustment failed', error);
            throw error;
        }
    }
}

export default new EventHandders();
