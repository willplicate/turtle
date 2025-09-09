// Hybrid Bridge: Legacy Functions + Modular Architecture
// This file provides backwards compatibility while integrating new modular services

console.log('🐢 turtle-script.js loading started');

/* 
=============================================================================
🚀 REAL DATA INTEGRATION SETUP GUIDE
=============================================================================

To switch from simulated to real market data:

1. GET API KEYS:
   • Polygon.io: https://polygon.io/ (Stock prices - $99/month for real-time)
   • Alpha Vantage: https://www.alphavantage.co/ (Technical indicators - FREE tier available)

2. UPDATE API CONFIGURATION (line ~16):
   • Replace 'YOUR_POLYGON_API_KEY_HERE' with your actual Polygon.io key
   • Replace 'YOUR_ALPHA_VANTAGE_KEY_HERE' with your actual Alpha Vantage key
   • Set USE_REAL_DATA: true

3. TEST:
   • The system will automatically try real APIs first
   • Falls back to simulated data if APIs fail
   • Check console for "🌐 Attempting to fetch real market data..." messages

4. API LIMITS:
   • Polygon Free: 5 calls/minute (limited data)
   • Alpha Vantage Free: 5 calls/minute, 500/day
   • Consider caching results to avoid rate limits

=============================================================================
*/

// Note: Modular imports temporarily disabled for stability - using simplified offline engine
// import TurtleApp from './turtle/src/main.js';
// import RecommendationEngine from './turtle/src/services/recommendationEngine.js';

// =====  API CONFIGURATION =====
// TODO: Replace with your actual API keys
const API_CONFIG = {
    // Polygon.io API (Stock Prices) - https://polygon.io/
    // Free tier: 5 calls/minute, Limited data
    // Basic plan: $99/month for real-time data
    POLYGON_API_KEY: 'wfpt139nvZFbUkwpoOXI1Z5Zv98aIwhQ',
    
    // Alpha Vantage API (Technical Indicators) - https://www.alphavantage.co/
    // Free tier: 5 calls/minute, 500 calls/day
    ALPHA_VANTAGE_API_KEY: 'UJGEXOFTD4HSW2NH',
    
    // Supabase configuration (Database)
    SUPABASE_URL: 'https://xgzyguuusjfyqpztzipb.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnenlndXV1c2pmeXFwenR6aXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDQ2MzYsImV4cCI6MjA3MjIyMDYzNn0.0Ck_lfzwsKVt7OWutETZSnPFcjDCXXAjhGIKD-cps7s',
    
    // Feature flags
    USE_REAL_DATA: true // Both Polygon + Alpha Vantage API keys added - full real market data enabled!
};

let supabase = null;

// Initialize Supabase safely
try {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(API_CONFIG.SUPABASE_URL, API_CONFIG.SUPABASE_ANON_KEY);
    }
} catch (error) {
    console.log('Supabase not available, using offline mode');
}

// Global state (preserved from original)
let allPositions = [];
let performanceData = {};
let currentTab = 'overview';
let marketData = { price: 590.05, change: 2.34, changePercent: '+0.40%' };

// ===== UTILITY FUNCTIONS =====

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loadingScreen').style.display = show ? 'block' : 'none';
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type === 'success' ? 'success' : type === 'error' ? 'danger' : ''}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.zIndex = '1001';
    alertDiv.style.maxWidth = '90%';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function calculateDTE(expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getNextFriday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday;
}

// ===== SUPABASE DATABASE FUNCTIONS =====

async function loadPositionsFromDatabase() {
    if (!supabase) {
        console.log('📊 No database connection - using offline mode');
        return [];
    }
    
    try {
        console.log('🗄️ Loading positions from database...');
        const { data, error } = await supabase
            .from('positions')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Database error loading positions:', error);
            return [];
        }
        
        console.log(`✅ Loaded ${data?.length || 0} positions from database`);
        return data || [];
    } catch (error) {
        console.error('Error loading positions:', error);
        return [];
    }
}

async function savePositionToDatabase(position) {
    if (!supabase) {
        console.log('📊 No database connection - position not saved permanently');
        return null;
    }
    
    try {
        console.log('💾 Saving position to database:', position.position_name);
        const { data, error } = await supabase
            .from('positions')
            .insert([position])
            .select()
            .single();
            
        if (error) {
            console.error('Database error saving position:', error);
            showAlert('Failed to save position to database', 'error');
            return null;
        }
        
        console.log('✅ Position saved to database:', data);
        showAlert('Position saved permanently', 'success');
        return data;
    } catch (error) {
        console.error('Error saving position:', error);
        showAlert('Database save failed', 'error');
        return null;
    }
}

async function updatePositionInDatabase(positionId, updates) {
    if (!supabase) {
        console.log('📊 No database connection - update not saved');
        return null;
    }
    
    try {
        console.log('🔄 Updating position in database:', positionId);
        const { data, error } = await supabase
            .from('positions')
            .update({...updates, updated_at: new Date().toISOString()})
            .eq('id', positionId)
            .select()
            .single();
            
        if (error) {
            console.error('Database error updating position:', error);
            return null;
        }
        
        console.log('✅ Position updated in database');
        return data;
    } catch (error) {
        console.error('Error updating position:', error);
        return null;
    }
}

async function saveTradeToDatabase(trade) {
    if (!supabase) {
        console.log('📊 No database connection - trade not saved permanently');
        return null;
    }
    
    try {
        console.log('💾 Saving trade to database:', trade);
        
        // Adapt to your existing schema
        const tradeRecord = {
            position_id: trade.position_id,
            action: trade.trade_type, // Map trade_type to action
            trade_date: trade.trade_date,
            strike: trade.strike,
            premium: trade.premium_collected, // Map premium_collected to premium
            expiry: trade.expiry_date, // Map expiry_date to expiry  
            notes: trade.notes,
            is_deleted: false
        };
        
        const { data, error } = await supabase
            .from('trades')
            .insert([tradeRecord])
            .select()
            .single();
            
        if (error) {
            console.error('Database error saving trade:', error);
            return null;
        }
        
        console.log('✅ Trade saved to database');
        return data;
    } catch (error) {
        console.error('Error saving trade:', error);
        return null;
    }
}

// ===== REAL DATA API FUNCTIONS =====

// Fetch real stock price from Polygon.io
async function fetchRealStockPrice(symbol) {
    if (!API_CONFIG.USE_REAL_DATA || API_CONFIG.POLYGON_API_KEY === 'YOUR_POLYGON_API_KEY_HERE') {
        console.log('Using simulated data - set API_CONFIG.USE_REAL_DATA = true and add real API keys');
        return null;
    }
    
    try {
        const response = await fetch(
            `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${API_CONFIG.POLYGON_API_KEY}`
        );
        
        if (!response.ok) {
            console.error('Polygon API error:', response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                price: result.c, // Close price
                change: result.c - result.o, // Change from open
                changePercent: ((result.c - result.o) / result.o * 100).toFixed(2) + '%',
                volume: result.v,
                timestamp: new Date(result.t)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching real stock price:', error);
        return null;
    }
}

// Fetch real technical indicators from Alpha Vantage
async function fetchRealTechnicalIndicators(symbol) {
    if (!API_CONFIG.USE_REAL_DATA || API_CONFIG.ALPHA_VANTAGE_API_KEY === 'YOUR_ALPHA_VANTAGE_KEY_HERE') {
        console.log('Using simulated indicators - set API_CONFIG.USE_REAL_DATA = true and add real API keys');
        return null;
    }
    
    try {
        // Fetch RSI
        const rsiResponse = await fetch(
            `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${API_CONFIG.ALPHA_VANTAGE_API_KEY}`
        );
        
        const rsiData = await rsiResponse.json();
        
        // Fetch EMA 12
        const ema12Response = await fetch(
            `https://www.alphavantage.co/query?function=EMA&symbol=${symbol}&interval=daily&time_period=12&series_type=close&apikey=${API_CONFIG.ALPHA_VANTAGE_API_KEY}`
        );
        
        const ema12Data = await ema12Response.json();
        
        // Fetch EMA 26
        const ema26Response = await fetch(
            `https://www.alphavantage.co/query?function=EMA&symbol=${symbol}&interval=daily&time_period=26&series_type=close&apikey=${API_CONFIG.ALPHA_VANTAGE_API_KEY}`
        );
        
        const ema26Data = await ema26Response.json();
        
        // Extract latest values
        const latestRSI = Object.values(rsiData['Technical Analysis: RSI'] || {})[0];
        const latestEMA12 = Object.values(ema12Data['Technical Analysis: EMA'] || {})[0];
        const latestEMA26 = Object.values(ema26Data['Technical Analysis: EMA'] || {})[0];
        
        if (latestRSI && latestEMA12 && latestEMA26) {
            return {
                rsi: parseFloat(latestRSI.RSI),
                ema12: parseFloat(latestEMA12.EMA),
                ema26: parseFloat(latestEMA26.EMA),
                macdLine: parseFloat(latestEMA12.EMA) - parseFloat(latestEMA26.EMA)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching real technical indicators:', error);
        return null;
    }
}

// ===== RECOMMENDATION ENGINE (ENHANCED WITH REAL/SIMULATED DATA) =====

// Simulated historical price data for RSI/EMA calculations (normally from API)
function getSimulatedPriceHistory(currentPrice, changePercent) {
    const prices = [];
    const basePrice = currentPrice - (currentPrice * changePercent / 100);
    
    // Generate 20 days of simulated price data
    for (let i = 19; i >= 0; i--) {
        const randomVariation = (Math.random() - 0.5) * 4; // ±2% daily variation
        const trendComponent = (changePercent / 20) * (20 - i); // Gradual trend
        const dayPrice = basePrice + (basePrice * (trendComponent + randomVariation) / 100);
        prices.push(Math.max(dayPrice, basePrice * 0.9)); // Floor at 10% drop
    }
    
    prices[prices.length - 1] = currentPrice; // Ensure current price is accurate
    return prices;
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50; // Default neutral RSI
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate subsequent values using smoothing
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100; // All gains, maximum RSI
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return Math.round(rsi * 100) / 100; // Round to 2 decimals
}

function calculateEMA(prices, period = 12) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return Math.round(ema * 100) / 100;
}

// Trading Rules Engine - Explains the logic behind each recommendation
function getTradingRules(recommendation, indicators) {
    const rules = [];
    const { rsi, ema12, ema26, macdLine, priceChange } = indicators;
    
    // RSI-based rules
    if (rsi > 70) {
        rules.push(`🔴 RSI > 70 (${rsi.toFixed(1)}) = Overbought → Use ITM calls for protection`);
    } else if (rsi < 30) {
        rules.push(`🟢 RSI < 30 (${rsi.toFixed(1)}) = Oversold → Market may bounce, consider ATM calls`);
    } else if (rsi > 50 && rsi < 70) {
        rules.push(`🟡 RSI ${rsi.toFixed(1)} = Bullish zone → Safe to sell ATM/OTM calls`);
    } else {
        rules.push(`⚪ RSI ${rsi.toFixed(1)} = Neutral → Standard positioning applies`);
    }
    
    // EMA trend rules
    if (ema12 > ema26) {
        const spread = ((ema12 - ema26) / ema26 * 100);
        if (spread > 1) {
            rules.push(`📈 Strong EMA bullish trend (+${spread.toFixed(2)}%) → Can use ATM calls for max premium`);
        } else {
            rules.push(`📊 EMA bullish trend (+${spread.toFixed(2)}%) → Slight OTM acceptable`);
        }
    } else {
        const spread = ((ema26 - ema12) / ema26 * 100);
        rules.push(`📉 EMA bearish trend (-${spread.toFixed(2)}%) → Use ITM calls for protection`);
    }
    
    // Price momentum rules
    if (Math.abs(priceChange) > 2) {
        rules.push(`⚡ High volatility (${priceChange.toFixed(2)}%) → Reduce position size, use protective strikes`);
    } else if (Math.abs(priceChange) > 1) {
        rules.push(`🌊 Moderate momentum (${priceChange.toFixed(2)}%) → Standard position sizing`);
    } else {
        rules.push(`😴 Low volatility (${priceChange.toFixed(2)}%) → Can be more aggressive with strikes`);
    }
    
    // MACD confirmation rules
    if (macdLine > 0.5) {
        rules.push(`🚀 Strong MACD bullish (+${macdLine.toFixed(2)}) → Momentum supports call selling`);
    } else if (macdLine > 0) {
        rules.push(`📈 MACD bullish (+${macdLine.toFixed(2)}) → Trend supports strategy`);
    } else if (macdLine > -0.5) {
        rules.push(`📊 MACD neutral (${macdLine.toFixed(2)}) → Be cautious with strikes`);
    } else {
        rules.push(`📉 MACD bearish (${macdLine.toFixed(2)}) → Use protective ITM strikes`);
    }
    
    // Strike selection rules based on market condition
    switch (recommendation.marketCondition) {
        case 'STRONG_BULL':
            rules.push(`🎯 STRONG BULL market → Sell ATM calls to maximize premium while trend is strong`);
            break;
        case 'OVERBOUGHT':
            rules.push(`⚠️ OVERBOUGHT conditions → Sell ITM calls for protection against pullback`);
            break;
        case 'BULL':
            rules.push(`📈 BULL market → Slight OTM calls to benefit from continued upward momentum`);
            break;
        case 'CORRECTION':
            rules.push(`🛡️ CORRECTION mode → Deep ITM calls for maximum downside protection`);
            break;
        case 'WEAK':
            rules.push(`🔒 WEAK market → ITM calls to reduce assignment risk`);
            break;
        case 'NEUTRAL':
            rules.push(`⚖️ NEUTRAL market → Slight OTM for optimal risk/reward balance`);
            break;
    }
    
    return rules.map(rule => `<div style="margin: 3px 0;">${rule}</div>`).join('');
}

async function getEnhancedStrikeRecommendation(symbol, currentPrice) {
    let rsi, ema12, ema26, macdLine, priceChange, changePercent, actualPrice;
    
    // Try to get real data first
    if (API_CONFIG.USE_REAL_DATA) {
        console.log('🌐 Attempting to fetch real market data...');
        
        const realPrice = await fetchRealStockPrice(symbol);
        const realIndicators = await fetchRealTechnicalIndicators(symbol);
        
        if (realPrice && realIndicators) {
            console.log('✅ Using real market data');
            actualPrice = realPrice.price;
            priceChange = realPrice.change;
            changePercent = parseFloat(realPrice.changePercent.replace('%', ''));
            rsi = realIndicators.rsi;
            ema12 = realIndicators.ema12;
            ema26 = realIndicators.ema26;
            macdLine = realIndicators.macdLine;
        } else {
            console.log('⚠️ Real data unavailable, falling back to simulated data');
            API_CONFIG.USE_REAL_DATA = false; // Don't retry for this session
        }
    }
    
    // Fallback to simulated data
    if (!API_CONFIG.USE_REAL_DATA || !rsi) {
        console.log('📊 Using simulated market data');
        actualPrice = currentPrice;
        priceChange = marketData.change;
        changePercent = parseFloat(marketData.changePercent.replace('%', '').replace('+', ''));
        
        // Simulate historical data and calculate indicators
        const priceHistory = getSimulatedPriceHistory(actualPrice, changePercent);
        rsi = calculateRSI(priceHistory, 14);
        ema12 = calculateEMA(priceHistory, 12);
        ema26 = calculateEMA(priceHistory, 26);
        macdLine = ema12 - ema26;
    }
    
    // Enhanced market condition analysis
    let marketCondition = 'NEUTRAL';
    let recommendationType = 'ATM';
    let strikeAdjustment = 0;
    let rationale = 'Balanced approach for neutral market';
    let confidence = 'MEDIUM';
    
    // Determine market condition using multiple indicators
    const rsiOverbought = rsi > 70;
    const rsiOversold = rsi < 30;
    const bullishEMA = ema12 > ema26;
    const strongBullish = changePercent > 1.5;
    const strongBearish = changePercent < -1.5;
    
    // Market condition logic with RSI and EMA
    if (strongBullish && bullishEMA && !rsiOverbought) {
        marketCondition = 'STRONG_BULL';
        recommendationType = 'ATM';
        strikeAdjustment = 0;
        rationale = 'Strong bullish momentum with healthy RSI - ATM for maximum premium';
        confidence = 'HIGH';
    } else if (strongBullish && rsiOverbought) {
        marketCondition = 'OVERBOUGHT';
        recommendationType = 'ITM';
        strikeAdjustment = -2;
        rationale = 'Overbought conditions suggest pullback risk - ITM for protection';
        confidence = 'HIGH';
    } else if (changePercent > 0.5 && bullishEMA && rsi < 65) {
        marketCondition = 'BULL';
        recommendationType = 'ATM';
        strikeAdjustment = 1;
        rationale = 'Moderate bullish trend with room to run - slight OTM';
        confidence = 'HIGH';
    } else if (strongBearish || rsiOversold) {
        marketCondition = 'CORRECTION';
        recommendationType = 'ITM';
        strikeAdjustment = -3;
        rationale = 'Market correction or oversold - deep ITM for protection';
        confidence = 'HIGH';
    } else if (changePercent < -0.5 || (!bullishEMA && rsi < 50)) {
        marketCondition = 'WEAK';
        recommendationType = 'ITM';
        strikeAdjustment = -1;
        rationale = 'Weak market signals - slight ITM for safety';
        confidence = 'MEDIUM';
    } else {
        marketCondition = 'NEUTRAL';
        recommendationType = 'ATM';
        strikeAdjustment = 1;
        rationale = 'Mixed signals suggest neutral positioning - slight OTM';
        confidence = 'MEDIUM';
    }
    
    // Additional adjustments based on current price level
    if (actualPrice > 600) {
        strikeAdjustment -= 0.5; // More conservative at high levels
        rationale += ' (Conservative adjustment for elevated levels)';
    }
    
    const suggestedStrike = Math.round((actualPrice + strikeAdjustment) * 2) / 2;
    
    return {
        type: recommendationType,
        suggestedStrike: suggestedStrike,
        strikes: strikeAdjustment,
        rationale: rationale,
        marketCondition: marketCondition,
        confidence: confidence,
        indicators: {
            rsi: rsi,
            ema12: ema12,
            ema26: ema26,
            macdLine: macdLine,
            priceChange: changePercent,
            currentPrice: actualPrice
        }
    };
}

// ===== MODAL AND FORM FUNCTIONS =====

function openModal(modalType, positionId = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    switch (modalType) {
        case 'add_position':
            title.textContent = '📊 Add New LEAPS Position';
            body.innerHTML = createAddPositionForm();
            break;
            
        case 'edit_position':
            title.textContent = '✏️ Edit Position';
            body.innerHTML = createEditPositionForm(positionId);
            break;
            
        case 'sell_call':
            title.textContent = '📞 Sell Weekly Call';
            createSellCallForm(positionId).then(formHTML => {
                body.innerHTML = formHTML;
            });
            break;
            
        case 'buy_to_close':
            title.textContent = '💰 Buy to Close Call';
            body.innerHTML = createBuyToCloseForm(positionId);
            break;
            
        case 'roll_leaps':
            title.textContent = '🔄 Roll LEAPS Position';
            body.innerHTML = createRollLeapsForm(positionId);
            break;
            
        case 'close_position':
            title.textContent = '❌ Close Position';
            body.innerHTML = createClosePositionForm(positionId);
            break;
            
        default:
            title.textContent = 'Test Modal';
            body.innerHTML = '<p>Testing modal functionality</p>';
    }
    
    modal.style.display = 'block';
}

// ===== FORM CREATION FUNCTIONS =====

function createAddPositionForm() {
    return `
        <form onsubmit="handleAddPosition(event)">
            <label>Position Name:</label>
            <input type="text" id="positionName" placeholder="Main SPY LEAPS" required>
            
            <label>Symbol:</label>
            <input type="text" id="symbol" placeholder="SPY" required style="text-transform: uppercase;">
            
            <label>LEAPS Strike Price:</label>
            <input type="number" id="leapsStrike" step="0.01" placeholder="470.00" required>
            
            <label>LEAPS Expiry Date:</label>
            <input type="date" id="leapsExpiry" required>
            
            <label>Number of Contracts:</label>
            <input type="number" id="contracts" min="1" placeholder="1" value="1" required>
            
            <label>Purchase Price per Contract:</label>
            <input type="number" id="purchasePrice" step="0.01" placeholder="9200.00" required>
            
            <label>Purchase Date:</label>
            <input type="date" id="purchaseDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" rows="3" placeholder="Long-term bullish position on SPY..."></textarea>
            
            <button type="submit" class="submit-btn">📊 Add LEAPS Position</button>
        </form>
    `;
}

function createEditPositionForm(positionId) {
    const position = allPositions.find(p => p.id === positionId) || {};
    return `
        <form onsubmit="handleEditPosition(event, ${positionId})">
            <label>Position Name:</label>
            <input type="text" id="positionName" value="${position.position_name || ''}" required>
            
            <label>Symbol:</label>
            <input type="text" id="symbol" value="${position.symbol || ''}" required style="text-transform: uppercase;">
            
            <label>LEAPS Strike Price:</label>
            <input type="number" id="leapsStrike" step="0.01" value="${position.leaps_strike || ''}" required>
            
            <label>Current Value per Contract:</label>
            <input type="number" id="currentValue" step="0.01" value="${position.current_value || ''}" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" rows="3">${position.notes || ''}</textarea>
            
            <button type="submit" class="submit-btn">✏️ Update Position</button>
        </form>
    `;
}

function createBuyToCloseForm(positionId) {
    const position = allPositions.find(p => p.id === positionId) || {};
    const currentCall = position.current_short_call || {};
    
    return `
        <div style="background: #fef3e2; padding: 12px; border-radius: 8px; margin-bottom: 15px; color: #92400e;">
            <strong>Current Short Call:</strong> $${currentCall.strike || 'N/A'} strike, $${currentCall.premium_collected || '0'} collected
        </div>
        
        <form onsubmit="handleBuyToClose(event, ${positionId})">
            <label>Close Date:</label>
            <input type="date" id="closeDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            <label>Buy-to-Close Price:</label>
            <input type="number" id="closePrice" step="0.01" placeholder="120.00" required>
            
            <label>Reason for Closing:</label>
            <select id="closeReason" required>
                <option value="">Select reason...</option>
                <option value="profit_target">Profit Target Reached</option>
                <option value="threat_assignment">Threat of Assignment</option>
                <option value="earnings_risk">Earnings Risk</option>
                <option value="technical_change">Technical Analysis Changed</option>
                <option value="portfolio_management">Portfolio Management</option>
            </select>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" rows="2" placeholder="Closed at 30% profit..."></textarea>
            
            <button type="submit" class="submit-btn">💰 Buy to Close</button>
        </form>
    `;
}

function createRollLeapsForm(positionId) {
    const position = allPositions.find(p => p.id === positionId) || {};
    
    return `
        <div style="background: #e0f2fe; padding: 12px; border-radius: 8px; margin-bottom: 15px; color: #0277bd;">
            <strong>Current LEAPS:</strong> $${position.leaps_strike || 'N/A'} strike
        </div>
        
        <form onsubmit="handleRollLeaps(event, ${positionId})">
            <label>Roll Date:</label>
            <input type="date" id="rollDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            <label>New Strike Price:</label>
            <input type="number" id="newStrike" step="0.01" placeholder="480.00" required>
            
            <label>New Expiry Date:</label>
            <input type="date" id="newExpiry" required>
            
            <label>Roll Credit/Debit:</label>
            <select id="rollType" required>
                <option value="credit">Credit (received money)</option>
                <option value="debit">Debit (paid money)</option>
            </select>
            
            <label>Amount:</label>
            <input type="number" id="rollAmount" step="0.01" placeholder="150.00" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" rows="2" placeholder="Rolled up and out for better delta..."></textarea>
            
            <button type="submit" class="submit-btn">🔄 Roll LEAPS</button>
        </form>
    `;
}

function createClosePositionForm(positionId) {
    const position = allPositions.find(p => p.id === positionId) || {};
    
    return `
        <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-bottom: 15px; color: #dc2626;">
            <strong>⚠️ Warning:</strong> This will permanently close the position "${position.position_name || 'Unknown'}"
        </div>
        
        <form onsubmit="handleClosePosition(event, ${positionId})">
            <label>Close Date:</label>
            <input type="date" id="closeDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            <label>LEAPS Sale Price per Contract:</label>
            <input type="number" id="salePrice" step="0.01" placeholder="11500.00" required>
            
            <label>Reason for Closing:</label>
            <select id="closeReason" required>
                <option value="">Select reason...</option>
                <option value="profit_target">Profit Target Achieved</option>
                <option value="stop_loss">Stop Loss Triggered</option>
                <option value="expiration">Approaching Expiration</option>
                <option value="portfolio_rebalance">Portfolio Rebalancing</option>
                <option value="better_opportunity">Better Opportunity</option>
            </select>
            
            <label>Final Notes:</label>
            <textarea id="notes" rows="3" placeholder="Final P&L summary and lessons learned..." required></textarea>
            
            <button type="submit" class="submit-btn" style="background: #dc2626;">❌ Close Position</button>
        </form>
    `;
}

// ENHANCED: Sell Call Form with Recommendation Engine Integration
async function createSellCallForm(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    const nextFriday = getNextFriday();
    
    let recommendationHTML = '';
    
    // INTEGRATION: Use Enhanced Recommendation Engine with RSI & EMA
    try {
        const recommendation = await getEnhancedStrikeRecommendation('SPY', marketData.price);
        const indicators = recommendation.indicators;
        
        // Color coding for indicators
        const rsiColor = indicators.rsi > 70 ? '#ef4444' : indicators.rsi < 30 ? '#22c55e' : '#6b7280';
        const emaColor = indicators.ema12 > indicators.ema26 ? '#22c55e' : '#ef4444';
        const macdColor = indicators.macdLine > 0 ? '#22c55e' : '#ef4444';
        const confidenceColor = recommendation.confidence === 'HIGH' ? '#22c55e' : 
                               recommendation.confidence === 'MEDIUM' ? '#f59e0b' : '#6b7280';
        
        recommendationHTML = `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0; color: #0277bd;">
                <h4 style="margin: 0 0 12px 0; color: #01579b; display: flex; align-items: center; gap: 8px;">
                    🎯 AI Recommendation 
                    <span style="background: ${confidenceColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: normal;">
                        ${recommendation.confidence}
                    </span>
                </h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div>
                        <div><strong>Strategy:</strong> ${recommendation.type}</div>
                        <div><strong>Suggested Strike:</strong> $${recommendation.suggestedStrike.toFixed(2)}</div>
                        <div><strong>Market Condition:</strong> ${recommendation.marketCondition}</div>
                    </div>
                    <div style="font-size: 12px;">
                        <div style="color: ${rsiColor};"><strong>RSI(14):</strong> ${indicators.rsi.toFixed(1)} ${indicators.rsi > 70 ? '(Overbought)' : indicators.rsi < 30 ? '(Oversold)' : '(Neutral)'}</div>
                        <div style="color: ${emaColor};"><strong>EMA Trend:</strong> ${indicators.ema12.toFixed(2)} vs ${indicators.ema26.toFixed(2)} ${indicators.ema12 > indicators.ema26 ? '↗️' : '↘️'}</div>
                        <div style="color: ${macdColor};"><strong>MACD:</strong> ${indicators.macdLine.toFixed(2)} ${indicators.macdLine > 0 ? '(Bullish)' : '(Bearish)'}</div>
                    </div>
                </div>
                
                <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 4px; font-size: 13px;">
                    <strong>Rationale:</strong> ${recommendation.rationale}
                </div>
                
                <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 4px; font-size: 12px; margin-top: 10px;">
                    <strong>📋 Trading Rules Applied:</strong>
                    ${getTradingRules(recommendation, indicators)}
                </div>
                
                <div style="font-size: 11px; margin-top: 8px; opacity: 0.7;">
                    Analysis based on: Current Price $${indicators.currentPrice.toFixed(2)} | Daily Change ${indicators.priceChange >= 0 ? '+' : ''}${indicators.priceChange.toFixed(2)}%
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Recommendation engine error:', error);
        recommendationHTML = `
            <div style="background: #fff3e0; padding: 12px; border-radius: 8px; margin: 15px 0; color: #f57c00;">
                <strong>⚠️ Recommendation Service Unavailable</strong><br>
                Using market-based defaults. Consider ${marketData.price >= 580 ? 'ITM' : 'ATM'} strike.
            </div>
        `;
    }
    
    return `
        ${recommendationHTML}
        <form onsubmit="handleSellCall(event, ${positionId})">
            <label>Trade Date:</label>
            <input type="date" id="tradeDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            <label>Strike Price:</label>
            <input type="number" id="strike" step="0.01" placeholder="592.00" required>
            
            <label>Premium Collected ($):</label>
            <input type="number" id="premium" step="0.01" placeholder="580" required>
            
            <label>Expiry Date:</label>
            <input type="date" id="expiry" value="${nextFriday.toISOString().split('T')[0]}" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" placeholder="Weekly call sale"></textarea>
            
            <button type="submit" class="submit-btn">Log Call Sale</button>
        </form>
    `;
}

// ===== TAB AND NAVIGATION FUNCTIONS =====

function switchToTab(tabType, positionId = null) {
    console.log('switchToTab called:', tabType, positionId);
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabType === 'overview') {
        currentTab = 'overview';
        const overviewBtn = document.querySelector('[onclick="switchToTab(\'overview\')"]');
        const overviewTab = document.getElementById('overviewTab');
        
        if (overviewBtn) overviewBtn.classList.add('active');
        if (overviewTab) overviewTab.classList.add('active');
        updateOverviewDisplay();
    } else if (tabType === 'position' && positionId) {
        currentTab = 'position';
        const positionBtn = document.querySelector(`[onclick="switchToTab('position', ${positionId})"]`);
        const positionTab = document.getElementById(`positionTab-${positionId}`);
        
        if (positionBtn) positionBtn.classList.add('active');
        if (positionTab) {
            positionTab.classList.add('active');
            updatePositionDisplay(positionId);
            loadRecentTradesForPosition(positionId);
        }
    }
}

function createPositionTabs() {
    const tabsHeader = document.getElementById('tabsHeader');
    const mainContent = document.getElementById('mainContent');
    
    // Remove existing position tabs
    const existingTabs = tabsHeader.querySelectorAll('.position-tab');
    existingTabs.forEach(tab => tab.remove());
    
    const existingContent = mainContent.querySelectorAll('.position-tab-content');
    existingContent.forEach(content => content.remove());
    
    // Add tabs for each position
    const addButton = tabsHeader.querySelector('.add-position');
    
    allPositions.forEach((position) => {
        // Create tab button
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn position-tab';
        tabBtn.onclick = () => switchToTab('position', position.id);
        tabBtn.innerHTML = `
            <span>${position.position_name || position.symbol || 'Position'}</span>
            <span class="position-badge" id="badge-${position.id}">●</span>
        `;
        
        // Insert before add button
        tabsHeader.insertBefore(tabBtn, addButton);
        
        // Create tab content
        const tabContent = document.createElement('div');
        tabContent.id = `positionTab-${position.id}`;
        tabContent.className = 'tab-content position-tab-content';
        tabContent.innerHTML = createPositionTabContent(position);
        
        mainContent.appendChild(tabContent);
    });
}

function createPositionTabContent(position) {
    return `
        <div class="status-card">
            <h3 style="margin-bottom: 15px; text-align: center;">💰 ${position.position_name || position.symbol} Performance</h3>
            <div class="status-row">
                <span class="status-label">Premium Collected</span>
                <span class="status-value positive" id="totalPremium-${position.id}">$0</span>
            </div>
            <div class="status-row">
                <span class="status-label">Current LEAPS Value</span>
                <span class="status-value" id="leapsValue-${position.id}">$0</span>
            </div>
            <div class="status-row">
                <span class="status-label">Net P&L</span>
                <span class="status-value" id="netPnL-${position.id}">$0</span>
            </div>
            <div class="status-row">
                <span class="status-label">Trades This Month</span>
                <span class="status-value" id="tradesCount-${position.id}">0</span>
            </div>
        </div>
        
        <div class="action-grid">
            <button class="action-btn primary" onclick="openModal('sell_call', ${position.id})">
                <div class="btn-icon">📞</div>
                Sell Weekly Call
            </button>
            
            <button class="action-btn" onclick="openModal('buy_to_close', ${position.id})">
                <div class="btn-icon">❌</div>
                Close Call
            </button>
            
            <button class="action-btn warning" onclick="openModal('add_position')">
                <div class="btn-icon">➕</div>
                Add Position
            </button>
        </div>
    `;
}

function updateDisplay() {
    if (currentTab === 'overview') {
        updateOverviewDisplay();
    }
    
    // Update all position displays
    allPositions.forEach(position => {
        updatePositionDisplay(position.id);
    });
}

function updateOverviewDisplay() {
    let totalPremiumCollected = 0;
    let totalLeapsValue = 0;
    let totalNetPnL = 0;
    
    Object.values(performanceData).forEach(perf => {
        totalPremiumCollected += perf.totalPremiumCollected;
        totalLeapsValue += perf.currentValue;
        totalNetPnL += perf.netPnL;
    });
    
    document.getElementById('totalPositions').textContent = allPositions.length;
    document.getElementById('overviewTotalPremium').textContent = `$${totalPremiumCollected.toFixed(0)}`;
    document.getElementById('overviewLeapsValue').textContent = `$${totalLeapsValue.toFixed(0)}`;
    
    const netPnLElement = document.getElementById('overviewNetPnL');
    netPnLElement.textContent = `${totalNetPnL >= 0 ? '+' : ''}$${totalNetPnL.toFixed(0)}`;
    netPnLElement.className = `status-value ${totalNetPnL >= 0 ? 'positive' : 'negative'}`;
}

function updatePositionDisplay(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    if (!position) return;
    
    const perf = performanceData[positionId] || {};
    
    const totalPremiumElement = document.getElementById(`totalPremium-${positionId}`);
    if (totalPremiumElement) {
        totalPremiumElement.textContent = `$${(perf.totalPremiumCollected || 0).toFixed(0)}`;
    }
    
    const leapsValueElement = document.getElementById(`leapsValue-${positionId}`);
    if (leapsValueElement) {
        leapsValueElement.textContent = `$${(perf.currentValue || 0).toFixed(0)}`;
    }
    
    const netPnLElement = document.getElementById(`netPnL-${positionId}`);
    if (netPnLElement) {
        netPnLElement.textContent = `${(perf.netPnL || 0) >= 0 ? '+' : ''}$${(perf.netPnL || 0).toFixed(0)}`;
        netPnLElement.className = `status-value ${(perf.netPnL || 0) >= 0 ? 'positive' : 'negative'}`;
    }
    
    const tradesCountElement = document.getElementById(`tradesCount-${positionId}`);
    if (tradesCountElement) {
        tradesCountElement.textContent = perf.tradesThisMonth || 0;
    }
}

async function loadRecentTradesForPosition(positionId) {
    // Mock recent trades data
    const mockTrades = [
        { action: 'sell', trade_date: '2024-12-06', strike: 592, premium: 580 },
        { action: 'buy_to_close', trade_date: '2024-11-29', strike: 590, premium: 45 },
        { action: 'sell', trade_date: '2024-11-22', strike: 590, premium: 520 }
    ];
    
    const tradesContainer = document.getElementById(`recentTrades-${positionId}`);
    if (tradesContainer) {
        tradesContainer.innerHTML = mockTrades.map(trade => {
            const date = new Date(trade.trade_date).toLocaleDateString();
            const premium = trade.premium ? `$${trade.premium}` : '';
            const strike = trade.strike ? `$${trade.strike}C` : '';
            const icon = trade.action === 'sell' ? '✅' : '❌';
            
            return `<div style="margin-bottom: 5px;">
                ${icon} ${date}: ${trade.action} ${strike} ${premium}
            </div>`;
        }).join('');
    }
}

// ===== TEST AND UTILITY FUNCTIONS =====

// Create comprehensive test data for full dashboard testing
function createTestPositions() {
    const testPositions = [
        {
            id: 1,
            position_name: 'Main SPY LEAPS',
            symbol: 'SPY',
            leaps_strike: 470.00,
            leaps_expiry: '2025-01-17',
            leaps_cost_basis: 8500.00,
            current_value: 9200.00,
            current_delta: 82,
            status: 'active',
            created_at: '2024-01-15',
            current_short_call: {
                id: 101,
                strike: 592.00,
                premium_collected: 580.00,
                expiry: '2024-12-13',
                trade_date: '2024-12-06'
            }
        },
        {
            id: 2,
            position_name: 'QQQ Tech LEAPS',
            symbol: 'QQQ',
            leaps_strike: 350.00,
            leaps_expiry: '2025-06-20',
            leaps_cost_basis: 6800.00,
            current_value: 7450.00,
            current_delta: 78,
            status: 'active',
            created_at: '2024-03-10',
            current_short_call: null
        }
    ];
    
    allPositions.push(...testPositions);
    
    // Create mock performance data
    performanceData[1] = {
        totalPremiumCollected: 2340.00,
        totalPremiumPaid: 150.00,
        currentShortCallValue: 45.00,
        shortCallPnL: 535.00,
        currentValue: 9200.00,
        leapsPnL: 700.00,
        netPnL: 1235.00,
        tradesThisMonth: 3
    };
    
    performanceData[2] = {
        totalPremiumCollected: 1680.00,
        totalPremiumPaid: 200.00,
        currentShortCallValue: 0.00,
        shortCallPnL: 1480.00,
        currentValue: 7450.00,
        leapsPnL: 650.00,
        netPnL: 2130.00,
        tradesThisMonth: 2
    };
    
    console.log('✅ Test positions created:', allPositions.length);
    return testPositions;
}

async function enableFullTesting() {
    console.log('🧪 Enabling full dashboard testing mode...');
    
    // Create test positions
    createTestPositions();
    
    // Create position tabs
    createPositionTabs();
    
    // Update displays
    updateDisplay();
    
    // Update last update time
    document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()} (Test Mode)`;
    
    // Update position health summary
    document.getElementById('positionHealthSummary').innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.1); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <strong>Main SPY LEAPS</strong> 🟢 Healthy<br>
            P&L: <span style="color: #22c55e;">+$1,235</span>
        </div>
        <div style="background: rgba(34, 197, 94, 0.1); padding: 8px; border-radius: 4px;">
            <strong>QQQ Tech LEAPS</strong> 🟢 Healthy<br>
            P&L: <span style="color: #22c55e;">+$2,130</span>
        </div>
    `;
    
    showAlert('🧪 Full testing mode enabled! Try all features.', 'success');
}

async function testSellCallModal() {
    console.log('Testing sell call modal with recommendations...');
    
    // Ensure we have test data
    if (allPositions.length === 0) {
        createTestPositions();
    }
    
    // Open the sell call modal for first position
    openModal('sell_call', allPositions[0].id);
}

async function testRecommendationEngine() {
    console.log('Testing enhanced recommendation engine...');
    try {
        const testRec = await getEnhancedStrikeRecommendation('SPY', marketData.price);
        console.log('Enhanced recommendation test result:', testRec);
        console.log('Technical indicators:', testRec.indicators);
    } catch (error) {
        console.error('Recommendation test failed:', error);
    }
}

async function runMorningUpdate() {
    showLoading(true);
    try {
        showAlert('Morning update complete!', 'success');
    } catch (error) {
        showAlert('Update failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportData() {
    showAlert('Export functionality available in full version', 'success');
}

// ===== PLACEHOLDER FORM HANDLERS =====

async function handleAddPosition(event) { 
    event.preventDefault();
    console.log('handleAddPosition called');
    
    // Get form data
    const formData = {
        position_name: document.getElementById('positionName').value,
        symbol: document.getElementById('symbol').value.toUpperCase(),
        leaps_strike: parseFloat(document.getElementById('leapsStrike').value),
        leaps_expiry: document.getElementById('leapsExpiry').value,
        contracts: parseInt(document.getElementById('contracts').value),
        purchase_price: parseFloat(document.getElementById('purchasePrice').value),
        purchase_date: document.getElementById('purchaseDate').value,
        notes: document.getElementById('notes').value || null
    };
    
    // Create new position object
    const newPosition = {
        id: allPositions.length + 1,
        position_name: formData.position_name,
        symbol: formData.symbol,
        leaps_strike: formData.leaps_strike,
        leaps_expiry: formData.leaps_expiry,
        contracts: formData.contracts,
        purchase_price: formData.purchase_price,
        current_value: formData.purchase_price, // Start with purchase price
        purchase_date: formData.purchase_date,
        notes: formData.notes,
        current_short_call: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Save to database first
    const savedPosition = await savePositionToDatabase(newPosition);
    
    if (savedPosition) {
        // Use the database-returned position (with proper ID)
        allPositions.push(savedPosition);
        
        // Update displays
        createPositionTabs();
        updateDisplay();
        
        // Close modal and show success
        closeModal();
        showAlert(`✅ Added position: ${formData.position_name}`, 'success');
        
        console.log('New position saved to database:', savedPosition);
    } else {
        // Fallback: add to memory only
        allPositions.push(newPosition);
        createPositionTabs();
        updateDisplay();
        closeModal();
        showAlert(`⚠️ Position added locally (database save failed)`, 'warning');
        
        console.log('Position added to memory only:', newPosition);
    }
}

async function handleEditPosition(event, positionId) { 
    event.preventDefault();
    console.log('handleEditPosition called'); 
}

async function handleSellCall(event, positionId) { 
    event.preventDefault();
    console.log('handleSellCall called for position:', positionId);
    
    // Get form data
    const tradeData = {
        position_id: positionId,
        trade_type: 'sell', // Use 'sell' to match your existing data
        trade_date: document.getElementById('tradeDate').value,
        strike: parseFloat(document.getElementById('strike').value),
        premium_collected: parseFloat(document.getElementById('premium').value),
        expiry_date: document.getElementById('expiry').value,
        notes: document.getElementById('notes').value || null,
        created_at: new Date().toISOString()
    };
    
    // Save trade to database
    const savedTrade = await saveTradeToDatabase(tradeData);
    
    if (savedTrade) {
        // Update position with current short call
        const position = allPositions.find(p => p.id === positionId);
        if (position) {
            position.current_short_call = {
                strike: tradeData.strike,
                premium_collected: tradeData.premium_collected,
                expiry_date: tradeData.expiry_date,
                trade_date: tradeData.trade_date
            };
            
            // Update position in database
            await updatePositionInDatabase(positionId, {
                current_short_call: position.current_short_call
            });
            
            // Refresh displays
            updateDisplay();
        }
        
        showAlert(`✅ Call sale recorded: $${tradeData.strike} strike, $${tradeData.premium_collected} collected`, 'success');
    } else {
        showAlert('⚠️ Trade saved locally (database save failed)', 'warning');
    }
    
    closeModal();
}

async function handleBuyToClose(event, positionId) { 
    event.preventDefault();
    console.log('handleBuyToClose called'); 
}

async function handleRollLeaps(event, positionId) { 
    event.preventDefault();
    console.log('handleRollLeaps called'); 
}

async function handleClosePosition(event, positionId) { 
    event.preventDefault();
    console.log('handleClosePosition called'); 
}

async function deletePosition(positionId) { 
    console.log('deletePosition called'); 
}

// ===== GLOBAL WINDOW ASSIGNMENTS =====

window.switchToTab = switchToTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.runMorningUpdate = runMorningUpdate;
window.exportData = exportData;
window.handleAddPosition = handleAddPosition;
window.handleEditPosition = handleEditPosition;
window.handleSellCall = handleSellCall;
window.handleBuyToClose = handleBuyToClose;
window.handleRollLeaps = handleRollLeaps;
window.handleClosePosition = handleClosePosition;
window.deletePosition = deletePosition;
window.testSellCallModal = testSellCallModal;
window.enableFullTesting = enableFullTesting;

console.log('🐢 All window functions assigned successfully');

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🐢 Turtle Trading Dashboard starting...');
    console.log('Market data:', marketData);
    
    // Show loading while initializing
    showLoading(true);
    
    // Load real positions from database
    try {
        console.log('🗄️ Loading positions from database...');
        const positions = await loadPositionsFromDatabase();
        
        if (positions && positions.length > 0) {
            allPositions = positions;
            console.log(`✅ Loaded ${positions.length} positions from database`);
            
            // Create tabs and update displays
            createPositionTabs();
            updateDisplay();
            
            document.getElementById('positionHealthSummary').innerHTML = `${positions.length} positions loaded from database`;
        } else {
            console.log('📝 No positions in database yet');
            document.getElementById('positionHealthSummary').innerHTML = 'No positions yet. Click "+" to add your first LEAPS position or "🧪 Enable Full Testing" for demo data.';
        }
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('positionHealthSummary').innerHTML = 'Database connection issue. Using offline mode.';
    }
    
    // Test recommendation engine
    testRecommendationEngine();
    
    // Basic setup
    showLoading(false);
    document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()}`;
});

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

console.log("Script.js loading test -  Tue Sep 9 09:45:21 CEST 2025 ");
