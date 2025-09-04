import SupabaseAPI from '../api/supabase.js';

class TradeLogger {
    async logTrade(tradeDetails) {
        const defaultTradeStructure = {
            trade_date: new Date().toISOString(),
            position_id: null,
            action: null,
            symbol: null,
            strike: null,
            premium: null,
            expiry: null,
            notes: null
        };

        const tradeRecord = { ...defaultTradeStructure, ...tradeDetails };

        try {
            const { data, error } = await SupabaseAPI.insertTrade(tradeRecord);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Trade logging failed:', error);
            throw error;
        }
    }

    async fetchRecentTrades(limit = 10) {
        return await SupabaseAPI.fetchRecentTrades(limit);
    }

    async calculateTradePerformance(positionId) {
        const trades = await SupabaseAPI.fetchTradesForPosition(positionId);
        
        const performance = {
            totalPremiumCollected: 0,
            totalPremiumPaid: 0,
            netPremium: 0
        };

        trades.forEach(trade => {
            if (trade.action === 'sell') {
                performance.totalPremiumCollected += trade.premium;
            }
            if (trade.action === 'buy_to_close') {
                performance.totalPremiumPaid += trade.premium;
            }
        });

        performance.netPremium = performance.totalPremiumCollected - performance.totalPremiumPaid;

        return performance;
    }
}

export default new TradeLogger();
