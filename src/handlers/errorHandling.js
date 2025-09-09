class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxErrorLogSize = 100;
    }

    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            context: context
        };

        this.errorLog.push(errorEntry);
        
        // Maintain log size
        if (this.errorLog.length > this.maxErrorLogSize) {
            this.errorLog.shift();
        }

        // Optional: Send to monitoring service
        this.reportToMonitoringService(errorEntry);
    }

    async reportToMonitoringService(errorEntry) {
        try {
            // Implement error reporting to external service if needed
            console.error('Error logged:', errorEntry);
        } catch (reportError) {
            console.error('Failed to report error', reportError);
        }
    }

    getRecentErrors(limit = 10) {
        return this.errorLog.slice(-limit);
    }

    clearErrorLog() {
        this.errorLog = [];
    }

    handleApiError(error) {
        const apiErrorMap = {
            'NetworkError': 'Check your internet connection',
            'Unauthorized': 'Authentication failed',
            'RateLimitExceeded': 'API rate limit reached',
            'ResourceNotFound': 'Requested resource does not exist'
        };

        const errorType = apiErrorMap[error.name] || 'Unknown API error';
        this.logError(error, { type: 'API_ERROR', details: errorType });

        return {
            success: false,
            message: errorType,
            originalError: error
        };
    }
}

export default new ErrorHandler();
