import PositionManager from '../services/positionManagement.js';
import TradeLogger from '../services/tradeLogging.js';
import RiskManager from '../services/riskManagement.js';
import ErrorHandler from './errorHandling.js';

class ModalInteractions {
    async handleAddPosition(positionData) {
        try {
            const newPosition = await PositionManager.createPosition(positionData);
            return newPosition;
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Add Position' });
            throw error;
        }
    }

    async handleEditPosition(positionId, updateData) {
        try {
            const updatedPosition = await PositionManager.updatePosition(positionId, updateData);
            return updatedPosition;
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Edit Position' });
            throw error;
        }
    }

    async handleRollLEAPS(positionId, rollDetails) {
        try {
            const riskAssessment = await RiskManager.calculatePositionRisk(positionId);
            
            if (riskAssessment.overallRisk === 'EXTREME_RISK') {
                throw new Error('Position too risky to roll');
            }

            const rolledPosition = await PositionManager.rollLeapsPosition(positionId, rollDetails);
            await TradeLogger.logRoll(positionId, rolledPosition);
            
            return rolledPosition;
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Roll LEAPS' });
            throw error;
        }
    }

    async handleSellCall(tradeDetails) {
        try {
            const trade = await TradeLogger.logTrade(tradeDetails);
            return trade;
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Sell Call' });
            throw error;
        }
    }

    async handleClosePosition(positionId) {
        try {
            const closedPosition = await PositionManager.closePosition(positionId);
            return closedPosition;
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Close Position' });
            throw error;
        }
    }
}

export default new ModalInteractions();
