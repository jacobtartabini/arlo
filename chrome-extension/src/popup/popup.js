/**
 * Arlo for Gmail - Popup Script
 * 
 * Handles popup UI interactions and communicates with service worker.
 */

// Send message to service worker
async function sendMessage(action, data = {}) {
  return chrome.runtime.sendMessage({ action, data });
}

// DOM Elements
const elements = {
  loadingState: document.getElementById('loading-state'),
  mainContent: document.getElementById('main-content'),
  arloStatus: document.getElementById('arlo-status'),
  arloDetails: document.getElementById('arlo-details'),
  arloEmail: document.getElementById('arlo-email'),
  arloBtn: document.getElementById('arlo-btn'),
  arloBtnText: document.getElementById('arlo-btn-text'),
  gmailSection: document.getElementById('gmail-section'),
  gmailStatus: document.getElementById('gmail-status'),
  gmailDetails: document.getElementById('gmail-details'),
  gmailEmail: document.getElementById('gmail-email'),
  gmailBtn: document.getElementById('gmail-btn'),
  gmailBtnText: document.getElementById('gmail-btn-text'),
  syncSection: document.getElementById('sync-section'),
  syncCount: document.getElementById('sync-count'),
  syncBtn: document.getElementById('sync-btn'),
  syncBtnText: document.getElementById('sync-btn-text'),
  syncResult: document.getElementById('sync-result'),
  activitySection: document.getElementById('activity-section'),
  accountsList: document.getElementById('accounts-list'),
};

// Current state
let state = {
  arloConnected: false,
  gmailConnected: false,
  arloIdentity: null,
  gmailUser: null,
  accounts: [],
  loading: false,
};

// Initialize popup
async function init() {
  showLoading(true);
  
  try {
    const status = await sendMessage('getStatus');
    updateState(status);
  } catch (error) {
    console.error('Failed to get status:', error);
  }
  
  showLoading(false);
  setupEventListeners();
}

// Update state and UI
function updateState(newState) {
  state = { ...state, ...newState };
  render();
}

// Render UI based on state
function render() {
  // Arlo status
  if (state.arloConnected) {
    elements.arloStatus.textContent = 'Connected';
    elements.arloStatus.classList.remove('disconnected');
    elements.arloStatus.classList.add('connected');
    elements.arloBtnText.textContent = 'Disconnect';
    elements.arloBtn.classList.remove('btn-primary');
    elements.arloBtn.classList.add('btn-danger');
    
    if (state.arloIdentity?.user) {
      elements.arloEmail.textContent = state.arloIdentity.user;
      elements.arloDetails.classList.remove('hidden');
    }
    
    // Show Gmail section
    elements.gmailSection.classList.remove('hidden');
  } else {
    elements.arloStatus.textContent = 'Disconnected';
    elements.arloStatus.classList.add('disconnected');
    elements.arloStatus.classList.remove('connected');
    elements.arloBtnText.textContent = 'Connect to Arlo';
    elements.arloBtn.classList.add('btn-primary');
    elements.arloBtn.classList.remove('btn-danger');
    elements.arloDetails.classList.add('hidden');
    
    // Hide Gmail section when not connected to Arlo
    elements.gmailSection.classList.add('hidden');
    elements.syncSection.classList.add('hidden');
    elements.activitySection.classList.add('hidden');
  }
  
  // Gmail status
  if (state.gmailConnected) {
    elements.gmailStatus.textContent = 'Connected';
    elements.gmailStatus.classList.remove('disconnected');
    elements.gmailStatus.classList.add('connected');
    elements.gmailBtnText.textContent = 'Disconnect';
    elements.gmailBtn.classList.remove('btn-secondary');
    elements.gmailBtn.classList.add('btn-danger');
    
    if (state.gmailUser?.email) {
      elements.gmailEmail.textContent = state.gmailUser.email;
      elements.gmailDetails.classList.remove('hidden');
    }
    
    // Show sync section
    if (state.arloConnected) {
      elements.syncSection.classList.remove('hidden');
    }
  } else {
    elements.gmailStatus.textContent = 'Disconnected';
    elements.gmailStatus.classList.add('disconnected');
    elements.gmailStatus.classList.remove('connected');
    elements.gmailBtnText.textContent = 'Connect Gmail';
    elements.gmailBtn.classList.add('btn-secondary');
    elements.gmailBtn.classList.remove('btn-danger');
    elements.gmailDetails.classList.add('hidden');
    elements.syncSection.classList.add('hidden');
  }
  
  // Accounts list
  if (state.accounts.length > 0) {
    elements.activitySection.classList.remove('hidden');
    renderAccounts();
  } else if (state.arloConnected) {
    elements.activitySection.classList.remove('hidden');
    elements.accountsList.innerHTML = '<p class="no-accounts">No accounts connected</p>';
  }
}

// Render connected accounts
function renderAccounts() {
  elements.accountsList.innerHTML = state.accounts.map(account => `
    <div class="account-item">
      <div class="account-info">
        <span class="account-provider">${account.provider}</span>
        <span class="account-email">${account.account_email || account.account_name}</span>
      </div>
      <span class="account-status ${account.enabled ? 'active' : 'inactive'}">
        ${account.enabled ? 'Active' : 'Inactive'}
      </span>
    </div>
  `).join('');
}

// Show/hide loading state
function showLoading(show) {
  if (show) {
    elements.loadingState.classList.remove('hidden');
    elements.mainContent.classList.add('hidden');
  } else {
    elements.loadingState.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Arlo connect/disconnect
  elements.arloBtn.addEventListener('click', async () => {
    if (state.loading) return;
    
    state.loading = true;
    elements.arloBtn.disabled = true;
    
    if (state.arloConnected) {
      const result = await sendMessage('disconnectArlo');
      if (result.success) {
        updateState({ arloConnected: false, arloIdentity: null, accounts: [] });
      }
    } else {
      elements.arloBtnText.textContent = 'Connecting...';
      const result = await sendMessage('connectArlo');
      
      if (result.success) {
        const status = await sendMessage('getStatus');
        updateState(status);
      } else {
        showError(result.error || 'Failed to connect to Arlo');
      }
    }
    
    state.loading = false;
    elements.arloBtn.disabled = false;
    render();
  });
  
  // Gmail connect/disconnect
  elements.gmailBtn.addEventListener('click', async () => {
    if (state.loading) return;
    
    state.loading = true;
    elements.gmailBtn.disabled = true;
    
    if (state.gmailConnected) {
      const result = await sendMessage('disconnectGmail');
      if (result.success) {
        updateState({ gmailConnected: false, gmailUser: null });
      }
    } else {
      elements.gmailBtnText.textContent = 'Connecting...';
      const result = await sendMessage('connectGmail');
      
      if (result.success) {
        updateState({ gmailConnected: true, gmailUser: result.user });
      } else {
        showError(result.error || 'Failed to connect Gmail');
      }
    }
    
    state.loading = false;
    elements.gmailBtn.disabled = false;
    render();
  });
  
  // Sync emails
  elements.syncBtn.addEventListener('click', async () => {
    if (state.loading) return;
    
    state.loading = true;
    elements.syncBtn.disabled = true;
    elements.syncBtnText.textContent = 'Syncing...';
    elements.syncResult.classList.add('hidden');
    
    const count = parseInt(elements.syncCount.value, 10);
    const result = await sendMessage('syncEmails', { count });
    
    if (result.success) {
      elements.syncResult.textContent = `✓ Synced ${result.synced} emails to Arlo`;
      elements.syncResult.classList.remove('hidden', 'error');
      elements.syncResult.classList.add('success');
    } else {
      elements.syncResult.textContent = `✗ ${result.error || 'Sync failed'}`;
      elements.syncResult.classList.remove('hidden', 'success');
      elements.syncResult.classList.add('error');
    }
    
    state.loading = false;
    elements.syncBtn.disabled = false;
    elements.syncBtnText.textContent = 'Sync Now';
  });
}

// Show error message
function showError(message) {
  elements.syncResult.textContent = `✗ ${message}`;
  elements.syncResult.classList.remove('hidden', 'success');
  elements.syncResult.classList.add('error');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
