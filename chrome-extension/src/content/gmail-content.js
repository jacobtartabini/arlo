/**
 * Arlo for Gmail - Content Script
 * 
 * Injects Arlo UI into Gmail for thread selection and sync.
 */

// Wait for Gmail to fully load
function waitForGmail(callback, maxAttempts = 50) {
  let attempts = 0;
  
  const check = () => {
    attempts++;
    
    // Check for Gmail's main content area
    const mainContent = document.querySelector('[role="main"]');
    const toolbars = document.querySelectorAll('[gh="tm"]');
    
    if (mainContent && toolbars.length > 0) {
      callback();
    } else if (attempts < maxAttempts) {
      setTimeout(check, 200);
    }
  };
  
  check();
}

// Inject Arlo button into Gmail toolbar
function injectArloButton() {
  // Don't inject if already present
  if (document.querySelector('.arlo-gmail-btn')) {
    return;
  }
  
  // Find Gmail's toolbar
  const toolbars = document.querySelectorAll('[gh="tm"]');
  
  if (toolbars.length === 0) {
    return;
  }
  
  // Create Arlo button container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'arlo-gmail-btn-container';
  btnContainer.innerHTML = `
    <button class="arlo-gmail-btn" title="Send to Arlo">
      <svg class="arlo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v8M8 12h8"/>
      </svg>
      <span class="arlo-btn-text">Send to Arlo</span>
    </button>
  `;
  
  // Add to each toolbar
  toolbars.forEach(toolbar => {
    const clone = btnContainer.cloneNode(true);
    toolbar.appendChild(clone);
    
    clone.querySelector('.arlo-gmail-btn').addEventListener('click', handleSendToArlo);
  });
}

// Get selected thread ID from Gmail
function getSelectedThreadId() {
  // Try to get thread ID from URL
  const url = window.location.href;
  const threadMatch = url.match(/\/([^\/]+)$/);
  
  if (threadMatch && threadMatch[1] && !['inbox', 'sent', 'drafts', 'spam', 'trash'].includes(threadMatch[1])) {
    // URL contains a thread/message ID
    return threadMatch[1];
  }
  
  // Check for selected rows in list view
  const selectedRows = document.querySelectorAll('tr[aria-selected="true"]');
  
  if (selectedRows.length > 0) {
    // Get thread ID from the first selected row
    const firstRow = selectedRows[0];
    const link = firstRow.querySelector('a[href*="/mail/"]');
    
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/\/([^\/]+)$/);
      return match ? match[1] : null;
    }
  }
  
  // Check for open thread view
  const threadView = document.querySelector('[data-legacy-thread-id]');
  if (threadView) {
    return threadView.getAttribute('data-legacy-thread-id');
  }
  
  // Alternative: check for message IDs in the DOM
  const messageContainer = document.querySelector('[data-message-id]');
  if (messageContainer) {
    const messageId = messageContainer.getAttribute('data-message-id');
    // Message ID format includes thread info
    return messageId;
  }
  
  return null;
}

// Handle Send to Arlo button click
async function handleSendToArlo(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const button = event.currentTarget;
  const originalText = button.querySelector('.arlo-btn-text').textContent;
  
  // Get thread ID
  const threadId = getSelectedThreadId();
  
  if (!threadId) {
    showNotification('Please select an email or open a thread first', 'error');
    return;
  }
  
  // Update button state
  button.disabled = true;
  button.querySelector('.arlo-btn-text').textContent = 'Sending...';
  button.classList.add('arlo-loading');
  
  try {
    // Send message to service worker
    const result = await chrome.runtime.sendMessage({
      action: 'sendThreadToArlo',
      data: { threadId }
    });
    
    if (result.success) {
      showNotification('Email sent to Arlo!', 'success');
    } else if (result.error?.includes('Not connected')) {
      showNotification('Please connect to Arlo first (click extension icon)', 'error');
    } else {
      showNotification(result.error || 'Failed to send to Arlo', 'error');
    }
  } catch (error) {
    showNotification('Failed to communicate with Arlo extension', 'error');
  }
  
  // Reset button
  button.disabled = false;
  button.querySelector('.arlo-btn-text').textContent = originalText;
  button.classList.remove('arlo-loading');
}

// Show notification toast
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.arlo-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `arlo-notification arlo-notification-${type}`;
  notification.innerHTML = `
    <span class="arlo-notification-icon">${type === 'success' ? '✓' : '✗'}</span>
    <span class="arlo-notification-text">${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  requestAnimationFrame(() => {
    notification.classList.add('arlo-notification-visible');
  });
  
  // Auto-dismiss
  setTimeout(() => {
    notification.classList.remove('arlo-notification-visible');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Create floating action button (FAB)
function createFloatingButton() {
  if (document.querySelector('.arlo-fab')) {
    return;
  }
  
  const fab = document.createElement('button');
  fab.className = 'arlo-fab';
  fab.title = 'Send to Arlo';
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v8M8 12h8"/>
    </svg>
  `;
  
  fab.addEventListener('click', handleSendToArlo);
  document.body.appendChild(fab);
}

// Observe DOM changes to re-inject buttons when Gmail updates
function observeGmailChanges() {
  const observer = new MutationObserver((mutations) => {
    // Check if toolbar might have been updated
    const shouldReinject = mutations.some(mutation => {
      return mutation.addedNodes.length > 0 || 
             (mutation.target.getAttribute && 
              mutation.target.getAttribute('role') === 'main');
    });
    
    if (shouldReinject) {
      injectArloButton();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize
function init() {
  console.log('[Arlo for Gmail] Initializing...');
  
  waitForGmail(() => {
    console.log('[Arlo for Gmail] Gmail loaded, injecting UI...');
    injectArloButton();
    createFloatingButton();
    observeGmailChanges();
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
