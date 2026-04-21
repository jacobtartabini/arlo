import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes('id-preview--') ||
  window.location.hostname.includes('lovableproject.com');

async function cleanupPreviewServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  if (!isInIframe && !isPreviewHost) return;

  const alreadyCleaned = sessionStorage.getItem('arlo_preview_sw_cleaned');

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if (!alreadyCleaned && (registrations.length > 0 || navigator.serviceWorker.controller)) {
      sessionStorage.setItem('arlo_preview_sw_cleaned', 'true');
      window.location.reload();
      return;
    }
  } catch (error) {
    console.warn('[main] Failed to clean preview service workers:', error);
  }
}

cleanupPreviewServiceWorkers().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />);
  console.log('Arlo AI Assistant loaded successfully');
});
