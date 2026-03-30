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
import { registerStandaloneHook, registerStandaloneNavigateHook } from './i18n/mode-flag';
import { useStandaloneTranslation } from './i18n/useStandaloneTranslation';
import { useStandaloneNavigate } from './hooks/useStandaloneNavigate';
import './theme/themes.css';

// Register standalone hooks before React renders.
// These are only imported here — never in the library build.
registerStandaloneHook(useStandaloneTranslation);
registerStandaloneNavigateHook(useStandaloneNavigate);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LancelotModeProvider mode="standalone" basePath="/">
      <App />
    </LancelotModeProvider>
  </StrictMode>,
);
