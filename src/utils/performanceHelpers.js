class PerformanceHelper {
    static calculateCompoundAnnualGrowthRate(initialValue, finalValue, years) {
        return Math.pow(finalValue / initialValue, 1 / years) - 1;
    }

    static calculateSharpeRatio(returns, riskFreeRate = 0.02) {
        const averageReturn = this.calculateAverageReturn(returns);
        const standardDeviation = this.calculateStandardDeviation(returns);
        
        return (averageReturn - riskFreeRate) / standardDeviation;
    }

    static calculateMaxDrawdown(values) {
        let maxDrawdown = 0;
        let peak = values[0];

        for (let i = 1; i < values.length; i++) {
            if (values[i] > peak) {
                peak = values[i];
            }
            
            const drawdown = (peak - values[i]) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }

        return maxDrawdown;
    }

    static calculateAverageReturn(returns) {
        return returns.reduce((a, b) => a + b, 0) / returns.length;
    }

    static calculateStandardDeviation(returns) {
        const avg = this.calculateAverageReturn(returns);
        const squaredDiffs = returns.map(r => Math.pow(r - avg, 2));
        return Math.sqrt(
            squaredDiffs.reduce((a, b) => a + b, 0) / returns.length
        );
    }

    static analyzeTradePerformance(trades) {
        const premiumCollected = trades
            .filter(trade => trade.action === 'sell')
            .reduce((total, trade) => total + trade.premium, 0);
        
        const premiumPaid = trades
            .filter(trade => trade.action === 'buy_to_close')
            .reduce((total, trade) => total + trade.premium, 0);

        return {
            totalPremiumCollected: premiumCollected,
            totalPremiumPaid: premiumPaid,
            netPremium: premiumCollected - premiumPaid
        };
    }
}

export default PerformanceHelper;
