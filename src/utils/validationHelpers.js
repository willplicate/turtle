class ValidationHelper {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidPhoneNumber(phone) {
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
        return phoneRegex.test(phone);
    }

    static validatePositionData(positionData) {
        const errors = {};

        if (!positionData.symbol || positionData.symbol.length < 1) {
            errors.symbol = 'Symbol is required';
        }

        if (!positionData.leaps_strike || positionData.leaps_strike <= 0) {
            errors.leaps_strike = 'Invalid strike price';
        }

        if (!positionData.leaps_expiry) {
            errors.leaps_expiry = 'Expiry date is required';
        }

        if (!positionData.leaps_cost_basis || positionData.leaps_cost_basis <= 0) {
            errors.leaps_cost_basis = 'Invalid cost basis';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    static validateTradeData(tradeData) {
        const errors = {};

        if (!tradeData.action) {
            errors.action = 'Trade action is required';
        }

        if (!tradeData.symbol) {
            errors.symbol = 'Symbol is required';
        }

        if (tradeData.premium === undefined || tradeData.premium < 0) {
            errors.premium = 'Invalid premium';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    static sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }
}

export default ValidationHelper;
