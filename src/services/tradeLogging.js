import SupabaseAPI from '../api/supabase.js';

class TradeLogger {
    async logRoll(originalTrade, newTrade, performanceDetails) {
        try {
            const rollRecord = {
                original_trade_id: originalTrade.id,
                original_strike: originalTrade.strike,
                original_premium: originalTrade.premium,
                new_strike: newTrade.strike,
                new_premium: newTrade.premium,
                roll_date: new Date().toISOString(),
                net_credit: performanceDetails.netCredit,
                p_and_l: performanceDetails.pnl,
                market_conditions: performanceDetails.marketState
            };

            return await SupabaseAPI.insertRollTrade(rollRecord);
        } catch (error) {
            console.error('Roll logging failed:', error);
            throw error;
        }
    }

    async calculateShortCallPnL(shortCall) {
        // Implement detailed P&L calculation for short calls
        const currentValue = await this.getCurrentShortCallValue(shortCall);
        return shortCall.premium_collected - currentValue;
    }

    async getCurrentShortCallValue(shortCall) {
        // Implement method to get current short call value
        // Could use Polygon API or other pricing source
    }
}

export default new TradeLogger();
