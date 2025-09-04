class MathHelper {
    static roundToDecimal(number, decimals = 2) {
        return Number(Math.round(number + "e" + decimals) + "e-" + decimals);
    }

    static calculatePercentageChange(oldValue, newValue) {
        return this.roundToDecimal((newValue - oldValue) / oldValue * 100);
    }

    static calculateRSI(prices, period = 14) {
        const changes = prices.map((price, index) => 
            index > 0 ? price - prices[index - 1] : 0
        );

        const gains = changes.map(change => Math.max(change, 0));
        const losses = changes.map(change => Math.abs(Math.min(change, 0)));

        const avgGain = this.average(gains.slice(0, period));
        const avgLoss = this.average(losses.slice(0, period));

        return 100 - (100 / (1 + (avgGain / avgLoss)));
    }

    static average(array) {
        return array.reduce((a, b) => a + b, 0) / array.length;
    }

    static standardDeviation(array) {
        const avg = this.average(array);
        const squareDiffs = array.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = this.average(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }
}

export default MathHelper;
