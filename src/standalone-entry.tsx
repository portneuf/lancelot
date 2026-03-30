/**
 * Standalone entry point for development and standalone builds.
 *
 * Wraps the app with LancelotModeProvider in standalone mode,
 * providing its own providers (Theme, I18n, Platform, Router).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LancelotModeProvider } from './mode-context';
import './theme/themes.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LancelotModeProvider mode="standalone" basePath="/">
      <App />
    </LancelotModeProvider>
  </StrictMode>,
);
