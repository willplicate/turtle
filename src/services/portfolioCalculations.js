import SupabaseAPI from '../api/supabase.js';
import PolygonAPI from '../api/polygon.js';

class PortfolioManager {
    constructor() {
        this.accounts = {
            account1: {
                balance: 0,
                deployedCapital: 0,
                deploymentPercentage: 0
            },
            account2: {
                balance: 0,
                deployedCapital: 0,
                deploymentPercentage: 0
            }
        };
    }

    async reconcileAccountBalance(accountName, newBalance) {
        if (!this.accounts[accountName]) {
            throw new Error('Invalid account name');
        }
        this.accounts[accountName].balance = newBalance;
        this.calculateDeploymentPercentages();
    }

    async calculateDeploymentPercentages() {
        for (const accountName in this.accounts) {
            const account = this.accounts[accountName];
            account.deploymentPercentage = (account.deployedCapital / account.balance) * 100;
        }
    }

    async calculatePortfolioMetrics() {
        const positions = await SupabaseAPI.fetchActivePositions();
        
        let totalAccountBalance = 0;
        let totalDeployedCapital = 0;

        for (let position of positions) {
            const currentPrice = await PolygonAPI.fetchStockPrice(position.symbol);
            const leapsValue = await this.calculateLeapsValue(position, currentPrice);
            
            // Assign to appropriate account
            const accountName = position.account_name.toLowerCase();
            if (this.accounts[accountName]) {
                this.accounts[accountName].deployedCapital += position.leaps_cost_basis;
            }

            totalDeployedCapital += position.leaps_cost_basis;
            totalAccountBalance += this.accounts[accountName].balance;
        }

        this.calculateDeploymentPercentages();

        return {
            accounts: this.accounts,
            totalAccountBalance,
            totalDeployedCapital,
            overallDeploymentPercentage: (totalDeployedCapital / totalAccountBalance) * 100
        };
    }

    async calculateLeapsValue(position, currentPrice) {
        // Implement LEAPS value calculation
        return 0; // Placeholder
    }
}

export default new PortfolioManager();
