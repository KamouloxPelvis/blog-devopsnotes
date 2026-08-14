import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import reportWebVitals from './reportWebVitals';


Sentry.init({
  dsn: "https://97dd53c2b61bbf7f75e5d17b49ed61d7@o4510760299986944.ingest.de.sentry.io/4510760304836688",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

// 1. Calmer l'overlay du runtime error (ResizeObserver)
const resizeObserverErrMsgs = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
];

const resizeObserverErrorHandler = (e: ErrorEvent) => {
  if (!e.message) return;
  if (resizeObserverErrMsgs.some(msg => e.message.includes(msg))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
};

window.addEventListener('error', resizeObserverErrorHandler);

// 2. Désactivation du Service Worker pour supprimer l'erreur 404
// On retire l'appel à registerServiceWorker() car le fichier est manquant.
// Si un ancien SW existe, on peut même l'effacer proprement :
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>
);

reportWebVitals();