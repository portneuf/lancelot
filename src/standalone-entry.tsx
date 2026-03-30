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
import { registerStandaloneHook } from './i18n/mode-flag';
import { useStandaloneTranslation } from './i18n/useStandaloneTranslation';
import './theme/themes.css';

// Register LinguiJS translation hook before React renders.
// This is only imported in standalone mode — never in the library build.
registerStandaloneHook(useStandaloneTranslation);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LancelotModeProvider mode="standalone" basePath="/">
      <App />
    </LancelotModeProvider>
  </StrictMode>,
);
