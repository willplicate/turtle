import config from './config/config.js';
import SupabaseAPI from './api/supabase.js';
import EventHandders from './handlers/eventHandders.js';
import ErrorHandler from './handlers/errorHandling.js';
import ModalInteractions from './handlers/modalInteractions.js';
import PortfolioCalculations from './services/portfolioCalculations.js';
import RiskManager from './services/riskManagement.js';

class TurtleTradeApp {
    constructor() {
        this.config = config;
        this.state = {
            positions: [],
            portfolioMetrics: null,
            riskAssessment: null
        };
    }

    async initialize() {
        try {
            await this.initializeSupabase();
            await this.loadInitialData();
            this.setupEventListeners();
            this.renderInitialDashboard();
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Application Initialization' });
        }
    }

    async initializeSupabase() {
        await SupabaseAPI.initialize(this.config.supabase);
    }

    async loadInitialData() {
        try {
            this.state.positions = await SupabaseAPI.fetchActivePositions();
            this.state.portfolioMetrics = await PortfolioCalculations.calculatePortfolioMetrics();
            this.state.riskAssessment = await RiskManager.assessPortfolioRisk();
        } catch (error) {
            ErrorHandler.logError(error, { action: 'Initial Data Load' });
        }
    }

    setupEventListeners() {
        document.addEventListener('position:roll', this.handlePositionRoll.bind(this));
        document.addEventListener('trade:weeklycall', this.handleWeeklyCallSale.bind(this));
        document.addEventListener('modal:addposition', this.handleAddPosition.bind(this));
    }

    async handlePositionRoll(event) {
        try {
            const rolledPosition = await EventHandders.handlePositionRoll(event.detail.positionId);
            this.updateState('positions', rolledPosition);
        } catch (error) {
            ErrorHandler.logError(error);
        }
    }

    async handleWeeklyCallSale(event) {
        try {
            const trade = await EventHandders.handleWeeklyCallSale(event.detail.symbol);
            this.updateState('trades', trade);
        } catch (error) {
            ErrorHandler.logError(error);
        }
    }

    async handleAddPosition(event) {
        try {
            const newPosition = await ModalInteractions.handleAddPosition(event.detail.positionData);
            this.updateState('positions', newPosition);
        } catch (error) {
            ErrorHandler.logError(error);
        }
    }

    updateState(key, data) {
        if (Array.isArray(this.state[key])) {
            this.state[key].push(data);
        } else {
            this.state[key] = data;
        }
        this.renderDashboard();
    }

    renderInitialDashboard() {
        // Initial dashboard rendering logic
        this.renderDashboard();
    }

    renderDashboard() {
        // Dashboard update logic based on current state
        console.log('Rendering dashboard with state:', this.state);
    }
}

const app = new TurtleTradeApp();
app.initialize();

export default app;
