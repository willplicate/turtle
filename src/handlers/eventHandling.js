import PortfolioCalculations from './portfolioCalculations.js';
import MarketAnalysis from './marketAnalysis.js';

class RiskManager {
    async assessPortfolioRisk() {
        const portfolioMetrics = await PortfolioCalculations.calculatePortfolioMetrics();
        const marketState = await MarketAnalysis.calculateMarketState('SPY');

        return {
            deploymentRisk: this.calculateDeploymentRisk(portfolioMetrics),
            marketRisk: this.calculateMarketRisk(marketState),
            recommendedAction: this.determineRiskAction(portfolioMetrics, marketState)
        };
    }

    calculateDeploymentRisk(portfolioMetrics) {
        const { overallDeploymentPercentage } = portfolioMetrics;
        
        if (overallDeploymentPercentage < 30) return 'LOW_RISK';
        if (overallDeploymentPercentage < 50) return 'MODERATE_RISK';
        if (overallDeploymentPercentage < 70) return 'HIGH_RISK';
        return 'EXTREME_RISK';
    }

    calculateMarketRisk(marketState) {
        const riskMap = {
            'STRONG_BULL': 'LOW_RISK',
            'BULL': 'LOW_MODERATE_RISK',
            'NEUTRAL': 'MODERATE_RISK',
            'WEAK': 'HIGH_RISK',
            'CORRECTION': 'EXTREME_RISK'
        };
        return riskMap[marketState];
    }

    determineRiskAction(portfolioMetrics, marketState) {
        const deploymentRisk = this.calculateDeploymentRisk(portfolioMetrics);
        const marketRisk = this.calculateMarketRisk(marketState);

        const riskActionMatrix = {
            'LOW_RISK-LOW_RISK': 'MAINTAIN_POSITIONS',
            'LOW_RISK-LOW_MODERATE_RISK': 'MAINTAIN_POSITIONS',
            'MODERATE_RISK-NEUTRAL': 'REDUCE_EXPOSURE',
            'HIGH_RISK-WEAK': 'SIGNIFICANT_REDUCTION',
            'EXTREME_RISK-CORRECTION': 'DEFENSIVE_POSITION'
        };

        return riskActionMatrix[`${deploymentRisk}-${marketRisk}`] || 'MONITOR_CLOSELY';
    }

    calculatePositionRisk(position) {
        // Implement position-level risk assessment
        const deltaRisk = this.assessDeltaRisk(position.current_delta);
        const timeRisk = this.assessTimeRisk(position.days_to_expiry);

        return {
            deltaRisk,
            timeRisk,
            overallRisk: this.combineRisks(deltaRisk, timeRisk)
        };
    }

    assessDeltaRisk(delta) {
        if (delta > 0.80) return 'LOW_RISK';
        if (delta > 0.70) return 'MODERATE_RISK';
        if (delta > 0.60) return 'HIGH_RISK';
        return 'EXTREME_RISK';
    }

    assessTimeRisk(daysToExpiry) {
        if (daysToExpiry > 120) return 'LOW_RISK';
        if (daysToExpiry > 90) return 'MODERATE_RISK';
        if (daysToExpiry > 60) return 'HIGH_RISK';
        return 'EXTREME_RISK';
    }

    combineRisks(deltaRisk, timeRisk) {
        const riskHierarchy = {
            'LOW_RISK': 1,
            'MODERATE_RISK': 2,
            'HIGH_RISK': 3,
            'EXTREME_RISK': 4
        };

        return Object.keys(riskHierarchy).find(
            risk => riskHierarchy[risk] === Math.max(
                riskHierarchy[deltaRisk], 
                riskHierarchy[timeRisk]
            )
        );
    }
}

export default new RiskManager();
