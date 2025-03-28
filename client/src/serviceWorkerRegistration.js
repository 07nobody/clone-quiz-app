// filepath: /home/neel/Downloads/github-copy/Quiz-Application-main/client/src/serviceWorkerRegistration.js
// This optional code is used to unregister any previously registered service worker.
// This is useful if you want to clear browser cache and stop seeing the Workbox errors.

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
        console.log('Service Worker unregistered successfully');
      })
      .catch(error => {
        console.error('Error unregistering service worker:', error);
      });
  }
}