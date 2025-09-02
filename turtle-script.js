// Supabase configuration
const SUPABASE_URL = 'https://xgzyguuusjfyqpztzipb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnenlndXV1c2pmeXFwenR6aXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDQ2MzYsImV4cCI6MjA3MjIyMDYzNn0.0Ck_lfzwsKVt7OWutETZSnPFcjDCXXAjhGIKD-cps7s';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let allPositions = [];
let performanceData = {};
let currentTab = 'overview';
let marketData = { price: 590.05, change: 2.34, changePercent: '+0.40%' };

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
});

async function loadDashboard() {
    showLoading(true);
    try {
        await loadAllPositions();
        await loadPerformanceData();
        createPositionTabs();
        updateDisplay();
        document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        showAlert('Failed to load dashboard: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadAllPositions() {
    const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true });
    
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    
    allPositions = data || [];
    
    // Load short calls for all positions
    for (const position of allPositions) {
        await loadCurrentShortCall(position);
    }
}

async function loadCurrentShortCall(position) {
    const { data: recentSells, error } = await supabase
        .from('trades')
        .select('*')
        .eq('position_id', position.id)
        .eq('is_deleted', false)
        .in('action', ['sell'])
        .order('trade_date', { ascending: false })
        .limit(10);
    
    if (error) return;
    
    // Find most recent sell that hasn't been closed
    for (const sell of recentSells) {
        const { data: closes } = await supabase
            .from('trades')
            .select('*')
            .eq('position_id', position.id)
            .eq('action', 'buy_to_close')
            .eq('is_deleted', false)
            .gte('trade_date', sell.trade_date)
            .limit(1);
        
        if (!closes || closes.length === 0) {
            position.current_short_call = {
                id: sell.id,
                strike: sell.strike,
                premium_collected: sell.premium,
                expiry: sell.expiry,
                trade_date: sell.trade_date
            };
            break;
        }
    }
}

async function loadPerformanceData() {
    const performanceByPosition = {};
    
    for (const position of allPositions) {
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('position_id', position.id)
            .eq('is_deleted', false)
            .order('trade_date', { ascending: false });
        
        if (error) continue;
        
        let totalPremium = 0;
        let tradesThisMonth = 0;
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        
        if (trades) {
            trades.forEach(trade => {
                if (trade.action === 'sell') {
                    totalPremium += parseFloat(trade.premium || 0);
                } else if (trade.action === 'buy_to_close') {
                    totalPremium -= parseFloat(trade.premium || 0);
                }
                
                const tradeDate = new Date(trade.trade_date);
                if (tradeDate.getMonth() === thisMonth && tradeDate.getFullYear() === thisYear) {
                    tradesThisMonth++;
                }
            });
        }
        
        const capitalDeployed = parseFloat(position.leaps_cost_basis) || 0;
        const currentValue = parseFloat(position.current_value) || 0;
        
        performanceByPosition[position.id] = {
            totalPremium: totalPremium,
            currentValue: currentValue,
            netPnL: (totalPremium + currentValue) - capitalDeployed,
            tradesThisMonth: tradesThisMonth
        };
    }
    
    performanceData = performanceByPosition;
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
        <!-- Performance Summary -->
        <div class="status-card">
            <button class="edit-position-btn" onclick="openModal('edit_position', ${position.id})">✏️</button>
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
        
        <!-- Current Position -->
        <div class="status-card">
            <h3 style="margin-bottom: 15px;">📊 Position Details</h3>
            <div class="status-row">
                <span class="status-label">${position.symbol} Price</span>
                <span class="status-value" id="spyPrice-${position.id}">$${marketData.price.toFixed(2)}</span>
            </div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.2); margin: 15px 0; padding-top: 15px;">
                <h4 style="margin-bottom: 10px; font-size: 14px;">LEAPS Position</h4>
                <div class="status-row">
                    <span class="status-label">Strike</span>
                    <span class="status-value" id="leapsStrike-${position.id}">$${position.leaps_strike}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Current Value</span>
                    <span class="status-value" id="leapsCurrentValue-${position.id}">$${(position.current_value || 0).toFixed(0)}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Delta</span>
                    <span class="status-value" id="leapsDelta-${position.id}">${position.current_delta}%</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Health</span>
                    <span class="status-value" id="leapsHealth-${position.id}">🟢 GOOD</span>
                </div>
                <div class="status-row">
                    <span class="status-label">DTE</span>
                    <span class="status-value" id="leapsDTE-${position.id}">-- days</span>
                </div>
            </div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.2); margin: 15px 0; padding-top: 15px;">
                <h4 style="margin-bottom: 10px; font-size: 14px;">Short Call Position</h4>
                <div class="status-row">
                    <span class="status-label">Strike</span>
                    <span class="status-value" id="shortStrike-${position.id}">-</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Premium Collected</span>
                    <span class="status-value positive" id="shortPremium-${position.id}">$0</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Current Value</span>
                    <span class="status-value" id="shortCurrentValue-${position.id}">$0</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Unrealized P&L</span>
                    <span class="status-value" id="shortPnL-${position.id}">$0</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Days to Expiry</span>
                    <span class="status-value" id="shortDTE-${position.id}">-</span>
                </div>
            </div>
        </div>
        
        <!-- Position-Specific Actions -->
        <div class="action-grid">
            <button class="action-btn primary" onclick="openModal('sell_call', ${position.id})">
                <div class="btn-icon">📞</div>
                Sell Weekly Call
            </button>
            
            <button class="action-btn" onclick="openModal('buy_to_close', ${position.id})">
                <div class="btn-icon">❌</div>
                Close Call
            </button>
            
            <button class="action-btn warning" onclick="openModal('roll_leaps', ${position.id})">
                <div class="btn-icon">⬆️</div>
                Roll LEAPS
            </button>
            
            <button class="action-btn danger" onclick="openModal('close_position', ${position.id})">
                <div class="btn-icon">🗑️</div>
                Close Position
            </button>
        </div>
        
        <!-- Recent Trades -->
        <div class="status-card">
            <h3>📝 Recent Trades</h3>
            <div id="recentTrades-${position.id}" style="font-size: 12px; margin-top: 10px;">
                Loading trades...
            </div>
        </div>
    `;
}

function switchToTab(tabType, positionId = null) {
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
        document.querySelector('[onclick="switchToTab(\'overview\')"]').classList.add('active');
        document.getElementById('overviewTab').classList.add('active');
        updateOverviewDisplay();
    } else if (tabType === 'position' && positionId) {
        currentTab = 'position';
        document.querySelector(`[onclick="switchToTab('position', ${positionId})"]`).classList.add('active');
        document.getElementById(`positionTab-${positionId}`).classList.add('active');
        updatePositionDisplay(positionId);
        loadRecentTradesForPosition(positionId);
    }
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
    let totalPremium = 0;
    let totalLeapsValue = 0;
    let totalNetPnL = 0;
    
    Object.values(performanceData).forEach(perf => {
        totalPremium += perf.totalPremium;
        totalLeapsValue += perf.currentValue;
        totalNetPnL += perf.netPnL;
    });
    
    document.getElementById('totalPositions').textContent = allPositions.length;
    document.getElementById('overviewTotalPremium').textContent = `$${totalPremium.toFixed(0)}`;
    document.getElementById('overviewLeapsValue').textContent = `$${totalLeapsValue.toFixed(0)}`;
    
    const netPnLElement = document.getElementById('overviewNetPnL');
    netPnLElement.textContent = `${totalNetPnL >= 0 ? '+' : ''}$${totalNetPnL.toFixed(0)}`;
    netPnLElement.className = `status-value ${totalNetPnL >= 0 ? 'positive' : 'negative'}`;
    
    // Update position health summary
    const healthSummary = document.getElementById('positionHealthSummary');
    if (allPositions.length === 0) {
        healthSummary.innerHTML = 'No active positions. Click + to add your first LEAPS position.';
    } else {
        let healthHTML = '';
        allPositions.forEach(position => {
            const health = calculatePositionHealth(position);
            const perf = performanceData[position.id] || {};
            healthHTML += `
                <div style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                    <strong>${position.position_name || position.symbol}</strong> 
                    <span style="color: ${health.color};">${health.status}</span>
                    <br>P&L: <span style="color: ${perf.netPnL >= 0 ? '#4ade80' : '#f87171'};">${perf.netPnL >= 0 ? '+' : ''}${(perf.netPnL || 0).toFixed(0)}</span>
                </div>
            `;
        });
        healthSummary.innerHTML = healthHTML;
    }
}

function updatePositionDisplay(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    if (!position) return;
    
    const perf = performanceData[positionId] || {};
    
    // Update performance metrics
    const totalPremiumElement = document.getElementById(`totalPremium-${positionId}`);
    if (totalPremiumElement) {
        totalPremiumElement.textContent = `${perf.totalPremium.toFixed(0)}`;
    }
    
    const leapsValueElement = document.getElementById(`leapsValue-${positionId}`);
    if (leapsValueElement) {
        leapsValueElement.textContent = `${perf.currentValue.toFixed(0)}`;
    }
    
    const netPnLElement = document.getElementById(`netPnL-${positionId}`);
    if (netPnLElement) {
        netPnLElement.textContent = `${perf.netPnL >= 0 ? '+' : ''}${perf.netPnL.toFixed(0)}`;
        netPnLElement.className = `status-value ${perf.netPnL >= 0 ? 'positive' : 'negative'}`;
    }
    
    const tradesCountElement = document.getElementById(`tradesCount-${positionId}`);
    if (tradesCountElement) {
        tradesCountElement.textContent = perf.tradesThisMonth;
    }
    
    // Update LEAPS details
    const dte = calculateDTE(position.leaps_expiry);
    const dteElement = document.getElementById(`leapsDTE-${positionId}`);
    if (dteElement) {
        dteElement.textContent = `${dte} days`;
        dteElement.className = `status-value ${dte < 90 ? 'warning' : dte < 120 ? 'neutral' : 'positive'}`;
    }
    
    const health = calculatePositionHealth(position);
    const healthElement = document.getElementById(`leapsHealth-${positionId}`);
    if (healthElement) {
        healthElement.textContent = health.display;
        healthElement.className = `status-value ${health.color}`;
    }
    
    // Update short call details
    if (position.current_short_call) {
        const shortCall = position.current_short_call;
        const shortDTE = calculateDTE(shortCall.expiry);
        const currentShortValue = estimateShortCallValue(shortCall.strike, shortDTE);
        const shortPnL = (shortCall.premium_collected || 0) - currentShortValue;
        
        const shortStrikeElement = document.getElementById(`shortStrike-${positionId}`);
        if (shortStrikeElement) {
            shortStrikeElement.textContent = `${shortCall.strike}`;
        }
        
        const shortPremiumElement = document.getElementById(`shortPremium-${positionId}`);
        if (shortPremiumElement) {
            shortPremiumElement.textContent = `${(shortCall.premium_collected || 0).toFixed(0)}`;
        }
        
        const shortCurrentValueElement = document.getElementById(`shortCurrentValue-${positionId}`);
        if (shortCurrentValueElement) {
            shortCurrentValueElement.textContent = `${currentShortValue.toFixed(0)}`;
        }
        
        const shortPnLElement = document.getElementById(`shortPnL-${positionId}`);
        if (shortPnLElement) {
            shortPnLElement.textContent = `${shortPnL >= 0 ? '+' : ''}${shortPnL.toFixed(0)}`;
            shortPnLElement.className = `status-value ${shortPnL >= 0 ? 'positive' : 'negative'}`;
        }
        
        const shortDTEElement = document.getElementById(`shortDTE-${positionId}`);
        if (shortDTEElement) {
            shortDTEElement.textContent = `${shortDTE} days`;
            shortDTEElement.className = `status-value ${shortDTE <= 2 ? 'warning' : 'positive'}`;
        }
    } else {
        // No active short call - clear displays
        const elements = ['shortStrike', 'shortPremium', 'shortCurrentValue', 'shortPnL', 'shortDTE'];
        elements.forEach(elem => {
            const element = document.getElementById(`${elem}-${positionId}`);
            if (element) {
                if (elem === 'shortStrike') element.textContent = 'None';
                else if (elem === 'shortDTE') element.textContent = '-';
                else element.textContent = '$0';
            }
        });
    }
    
    // Update position badge
    const badge = document.getElementById(`badge-${positionId}`);
    if (badge) {
        badge.className = `position-badge ${health.badgeClass}`;
    }
}

function calculatePositionHealth(position) {
    if (!position || !marketData) {
        return { display: 'CALCULATING', color: 'neutral', status: 'Unknown', badgeClass: 'warning' };
    }
    
    const delta = position.current_delta || 0;
    const dte = calculateDTE(position.leaps_expiry);
    const cushion = marketData.price - position.leaps_strike;
    
    let score = 0;
    if (delta > 80) score += 40;
    else if (delta > 75) score += 30;
    else if (delta > 72) score += 20;
    else score += 10;
    
    if (dte > 120) score += 30;
    else if (dte > 90) score += 20;
    else score += 10;
    
    if (cushion > 30) score += 30;
    else if (cushion > 20) score += 20;
    else score += 10;
    
    if (score > 70) {
        return { display: '🟢 GOOD', color: 'positive', status: '🟢 Healthy', badgeClass: '' };
    } else if (score > 50) {
        return { display: '🟡 WARNING', color: 'warning', status: '🟡 Warning', badgeClass: 'warning' };
    } else {
        return { display: '🔴 CRITICAL', color: 'negative', status: '🔴 Critical', badgeClass: 'danger' };
    }
}

function calculateDTE(expiryDate) {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function estimateShortCallValue(strike, daysToExpiry) {
    if (!marketData || daysToExpiry <= 0) return 0;
    
    const spyPrice = marketData.price;
    const intrinsicValue = Math.max(0, spyPrice - strike);
    
    // Simple time value estimation
    const timeValueFactor = Math.max(0.1, daysToExpiry / 7);
    const timeValue = timeValueFactor * 2;
    
    return intrinsicValue + timeValue;
}

async function loadRecentTradesForPosition(positionId) {
    const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('position_id', positionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5);
    
    const tradesContainer = document.getElementById(`recentTrades-${positionId}`);
    
    if (error || !data || data.length === 0) {
        tradesContainer.innerHTML = '<div>No trades recorded yet</div>';
        return;
    }
    
    tradesContainer.innerHTML = data.map(trade => {
        const date = new Date(trade.trade_date).toLocaleDateString();
        const premium = trade.premium ? `${parseFloat(trade.premium).toFixed(0)}` : '';
        const strike = trade.strike ? `${trade.strike}C` : '';
        
        return `<div style="margin-bottom: 5px;">
            ${getActionIcon(trade.action)} ${date}: ${trade.action} ${strike} ${premium}
        </div>`;
    }).join('');
}

function getActionIcon(action) {
    const icons = {
        'sell': '✅',
        'buy_to_close': '❌',
        'roll_up': '⬆️',
        'roll_down': '⬇️',
        'roll_out': '➡️',
        'roll_leaps': '🔄',
        'assigned_stock': '📉',
        'called_away': '📞'
    };
    return icons[action] || '📝';
}

// Modal Functions
function openModal(modalType, positionId = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    switch (modalType) {
        case 'add_position':
            title.textContent = 'Add New LEAPS Position';
            body.innerHTML = createAddPositionForm();
            break;
        case 'edit_position':
            title.textContent = 'Edit Position';
            body.innerHTML = createEditPositionForm(positionId);
            break;
        case 'sell_call':
            title.textContent = 'Sell Weekly Call';
            body.innerHTML = createSellCallForm(positionId);
            break;
        case 'buy_to_close':
            title.textContent = 'Buy to Close Call';
            body.innerHTML = createBuyToCloseForm(positionId);
            break;
        case 'roll_leaps':
            title.textContent = 'Roll LEAPS Position';
            body.innerHTML = createRollLeapsForm(positionId);
            break;
        case 'close_position':
            title.textContent = 'Close Position';
            body.innerHTML = createClosePositionForm(positionId);
            break;
        default:
            title.textContent = 'Modal';
            body.innerHTML = '<p>Unknown modal type</p>';
    }
    
    modal.style.display = 'block';
}

function createAddPositionForm() {
    return `
        <form onsubmit="handleAddPosition(event)">
            <label>Position Name:</label>
            <input type="text" id="positionName" placeholder="e.g., Main SPY LEAPS" required>
            
            <label>Symbol:</label>
            <input type="text" id="symbol" placeholder="SPY" value="SPY" required>
            
            <label>LEAPS Strike:</label>
            <input type="number" id="leapsStrike" step="0.01" placeholder="470.00" required>
            
            <label>LEAPS Expiry:</label>
            <input type="date" id="leapsExpiry" required>
            
            <label>Cost Basis ($):</label>
            <input type="number" id="costBasis" step="0.01" placeholder="8000" required>
            
            <label>Current Value ($):</label>
            <input type="number" id="currentValue" step="0.01" placeholder="8000" required>
            
            <label>Current Delta (%):</label>
            <input type="number" id="currentDelta" step="1" placeholder="80" min="1" max="100" required>
            
            <button type="submit" class="submit-btn">Create Position</button>
        </form>
    `;
}

function createEditPositionForm(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    if (!position) return '<p>Position not found</p>';
    
    return `
        <form onsubmit="handleEditPosition(event, ${positionId})">
            <label>Position Name:</label>
            <input type="text" id="editPositionName" value="${position.position_name || ''}" required>
            
            <label>LEAPS Strike:</label>
            <input type="number" id="editLeapsStrike" step="0.01" value="${position.leaps_strike}" required>
            
            <label>LEAPS Expiry:</label>
            <input type="date" id="editLeapsExpiry" value="${position.leaps_expiry}" required>
            
            <label>Current Value ($):</label>
            <input type="number" id="editCurrentValue" step="0.01" value="${position.current_value || 0}" required>
            
            <label>Current Delta (%):</label>
            <input type="number" id="editCurrentDelta" step="1" value="${position.current_delta || 80}" min="1" max="100" required>
            
            <div style="margin: 20px 0;">
                <button type="submit" class="submit-btn">Update Position</button>
            </div>
        </form>
        
        <div style="border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
            <button onclick="deletePosition(${positionId})" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; width: 100%;">
                Delete Position
            </button>
        </div>
    `;
}

function createSellCallForm(positionId) {
    const nextFriday = getNextFriday();
    return `
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

function createBuyToCloseForm(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    const shortCall = position?.current_short_call;
    
    return `
        <form onsubmit="handleBuyToClose(event, ${positionId})">
            <label>Trade Date:</label>
            <input type="date" id="tradeDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            ${shortCall ? `
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin: 10px 0;">
                <strong>Current Short Call:</strong><br>
                Strike: ${shortCall.strike}<br>
                Premium Collected: ${(shortCall.premium_collected || 0).toFixed(0)}<br>
                Expiry: ${shortCall.expiry}
            </div>
            ` : '<p>No active short call found for this position.</p>'}
            
            <label>Cost to Close ($):</label>
            <input type="number" id="closeCost" step="0.01" placeholder="50" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" placeholder="Close short call"></textarea>
            
            <button type="submit" class="submit-btn">Log Close Trade</button>
        </form>
    `;
}

function createRollLeapsForm(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    if (!position) return '<p>Position not found</p>';
    
    return `
        <form onsubmit="handleRollLeaps(event, ${positionId})">
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin: 10px 0;">
                <strong>Current LEAPS:</strong><br>
                Strike: ${position.leaps_strike}<br>
                Expiry: ${position.leaps_expiry}<br>
                Current Value: ${(position.current_value || 0).toFixed(0)}
            </div>
            
            <label>Trade Date:</label>
            <input type="date" id="tradeDate" value="${new Date().toISOString().split('T')[0]}" required>
            
            <label>New Strike Price:</label>
            <input type="number" id="newStrike" step="0.01" placeholder="560.00" required>
            
            <label>New Expiry Date:</label>
            <input type="date" id="newExpiry" required>
            
            <label>New Cost Basis ($):</label>
            <input type="number" id="newCostBasis" step="0.01" placeholder="8500" required>
            
            <label>New Current Value ($):</label>
            <input type="number" id="newCurrentValue" step="0.01" placeholder="8500" required>
            
            <label>New Delta (%):</label>
            <input type="number" id="newDelta" step="1" placeholder="82" min="1" max="100" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" placeholder="LEAPS roll - maintained same position"></textarea>
            
            <button type="submit" class="submit-btn">Roll LEAPS Position</button>
        </form>
    `;
}

function createClosePositionForm(positionId) {
    const position = allPositions.find(p => p.id === positionId);
    if (!position) return '<p>Position not found</p>';
    
    return `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; color: #92400e;">
            <strong>⚠️ Warning:</strong> This will permanently close the position and mark it as inactive. 
            All associated trades will remain in the database for historical tracking.
        </div>
        
        <form onsubmit="handleClosePosition(event, ${positionId})">
            <label>Reason for Closing:</label>
            <select id="closeReason" required>
                <option value="">Select reason...</option>
                <option value="called_away">LEAPS Called Away</option>
                <option value="sold_leaps">Sold LEAPS Position</option>
                <option value="expired_worthless">LEAPS Expired Worthless</option>
                <option value="strategy_change">Strategy Change</option>
                <option value="other">Other</option>
            </select>
            
            <label>Final LEAPS Value ($):</label>
            <input type="number" id="finalValue" step="0.01" placeholder="0" required>
            
            <label>Notes (Optional):</label>
            <textarea id="notes" placeholder="Position closing details"></textarea>
            
            <button type="submit" class="submit-btn" style="background: #ef4444;">Close Position</button>
        </form>
    `;
}

// Form Handlers
async function handleAddPosition(event) {
    event.preventDefault();
    try {
        const formData = {
            position_name: document.getElementById('positionName').value,
            symbol: document.getElementById('symbol').value,
            leaps_strike: parseFloat(document.getElementById('leapsStrike').value),
            leaps_expiry: document.getElementById('leapsExpiry').value,
            leaps_cost_basis: parseFloat(document.getElementById('costBasis').value),
            current_value: parseFloat(document.getElementById('currentValue').value),
            current_delta: parseFloat(document.getElementById('currentDelta').value),
            status: 'active'
        };
        
        const { error } = await supabase
            .from('positions')
            .insert([formData]);
        
        if (error) throw error;
        
        showAlert('New position created successfully!', 'success');
        closeModal();
        await loadDashboard();
    } catch (error) {
        showAlert('Failed to create position: ' + error.message, 'error');
    }
}

async function handleEditPosition(event, positionId) {
    event.preventDefault();
    try {
        const formData = {
            position_name: document.getElementById('editPositionName').value,
            leaps_strike: parseFloat(document.getElementById('editLeapsStrike').value),
            leaps_expiry: document.getElementById('editLeapsExpiry').value,
            current_value: parseFloat(document.getElementById('editCurrentValue').value),
            current_delta: parseFloat(document.getElementById('editCurrentDelta').value),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('positions')
            .update(formData)
            .eq('id', positionId);
        
        if (error) throw error;
        
        showAlert('Position updated successfully!', 'success');
        closeModal();
        await loadDashboard();
    } catch (error) {
        showAlert('Failed to update position: ' + error.message, 'error');
    }
}

async function handleSellCall(event, positionId) {
    event.preventDefault();
    try {
        const tradeData = {
            position_id: positionId,
            trade_date: document.getElementById('tradeDate').value,
            action: 'sell',
            strike: parseFloat(document.getElementById('strike').value),
            premium: parseFloat(document.getElementById('premium').value),
            expiry: document.getElementById('expiry').value,
            notes: document.getElementById('notes').value || null,
            is_deleted: false
        };
        
        const { error } = await supabase
            .from('trades')
            .insert([tradeData]);
        
        if (error) throw error;
        
        showAlert('Call sale logged successfully!', 'success');
        closeModal();
        await loadDashboard();
    } catch (error) {
        showAlert('Failed to log trade: ' + error.message, 'error');
    }
}

async function handleBuyToClose(event, positionId) {
    event.preventDefault();
    try {
        const tradeData = {
            position_id: positionId,
            trade_date: document.getElementById('tradeDate').value,
            action: 'buy_to_close',
            strike: 0, // Will be populated from current short call
            premium: parseFloat(document.getElementById('closeCost').value),
            expiry: null,
            notes: document.getElementById('notes').value || null,
            is_deleted: false
        };
        
        const { error } = await supabase
            .from('trades')
            .insert([tradeData]);
        
        if (error) throw error;
        
        showAlert('Close trade logged successfully!', 'success');
        closeModal();
        await loadDashboard();
    } catch (error) {
        showAlert('Failed to log trade: ' + error.message, 'error');
    }
}

async function handleRollLeaps(event, positionId) {
    event.preventDefault();
    try {
        const formData = {
            leaps_strike: parseFloat(document.getElementById('newStrike').value),
            leaps_expiry: document.getElementById('newExpiry').value,
            leaps_cost_basis: parseFloat(document.getElementById('newCostBasis').value),
            current_value: parseFloat(document.getElementById('newCurrentValue').value),
            current_delta: parseFloat(document.getElementById('newDelta').value),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('positions')
            .update(formData)
            .eq('id', positionId);
        
        if (error) throw error;
        
        // Log the roll as a trade
        const tradeData = {
            position_id: positionId,
            trade_date: document.getElementById('tradeDate').value,
            action: 'roll_leaps',
            strike: parseFloat(document.getElementById('newStrike').value),
            premium: 0,
            expiry: document.getElementById('newExpiry').value,
            notes: document.getElementById('notes').value || 'LEAPS roll',
            is_deleted: false
        };
        
        await supabase.from('trades').insert([tradeData]);
        
        showAlert('LEAPS rolled successfully!', 'success');
        closeModal();
        await loadDashboard();
    } catch (error) {
        showAlert('Failed to roll LEAPS: ' + error.message, 'error');
    }
}

async function handleClosePosition(event, positionId) {
    event.preventDefault();
    try {
        const { error } = await supabase
            .from('positions')
            .update({ 
                status: 'closed',
                current_value: parseFloat(document.getElementById('finalValue').value),
                updated_at: new Date().toISOString()
            })
            .eq('id', positionId);
        
        if (error) throw error;
        
        showAlert('Position closed successfully!', 'success');
        closeModal();
        await loadDashboard();
    } catch (error) {
        showAlert('Failed to close position: ' + error.message, 'error');
    }
}

async function deletePosition(positionId) {
    if (!confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('positions')
            .delete()
            .eq('id', positionId);
        
        if (error) throw error;
        
        showAlert('Position deleted successfully!', 'success');
        closeModal();
        await loadDashboard();
        switchToTab('overview');
    } catch (error) {
        showAlert('Failed to delete position: ' + error.message, 'error');
    }
}

// Utility Functions
function getNextFriday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday;
}

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

async function runMorningUpdate() {
    showLoading(true);
    try {
        await loadDashboard();
        showAlert('Morning update complete!', 'success');
    } catch (error) {
        showAlert('Update failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportData() {
    try {
        const { data: trades, error } = await supabase
            .from('trades')
            .select('*')
            .eq('is_deleted', false)
            .order('trade_date', { ascending: false });
        
        if (error) throw error;
        
        if (!trades || trades.length === 0) {
            showAlert('No trades to export', 'warning');
            return;
        }
        
        const headers = ['Date', 'Action', 'Strike', 'Premium', 'Expiry', 'Notes', 'Position_ID'];
        const csvContent = [
            headers.join(','),
            ...trades.map(trade => [
                trade.trade_date,
                trade.action,
                trade.strike || '',
                trade.premium || '',
                trade.expiry || '',
                (trade.notes || '').replace(/,/g, ';'),
                trade.position_id || ''
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turtle_trades_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showAlert('Data exported successfully!', 'success');
        
    } catch (error) {
        showAlert('Export failed: ' + error.message, 'error');
    }
}

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}
