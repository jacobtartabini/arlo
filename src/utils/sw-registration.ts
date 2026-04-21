// Service Worker Registration for Arlo AI Assistant PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // In Vite, we don't need PUBLIC_URL logic - just use the root path
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Arlo PWA is being served cache-first by a service worker.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Force a fresh check against the network for sw.js so users pick up
      // new caching logic without having to manually unregister.
      registration.update().catch(() => {});

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New Arlo content is available; activating immediately.');
              // Tell the new SW to take over without waiting for all tabs to close.
              installingWorker.postMessage({ type: 'SKIP_WAITING' });
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('Arlo content is cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };

      // When the controlling SW changes, reload once so the page runs against
      // the new build instead of stale cached chunks.
      let hasReloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloaded) return;
        hasReloaded = true;
        window.location.reload();
      });
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. Arlo is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}