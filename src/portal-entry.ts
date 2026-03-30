/**
 * Portal entry point — the public API of @portneuf/tool-lancelot.
 *
 * This is what the Portal imports when loading Lancelot as a tool:
 *
 *   import { lancelotRegistration, lancelotTranslations, lancelotFormatAdapters }
 *     from '@portneuf/tool-lancelot';
 */

import { setPortalMode } from './i18n/mode-flag';

// Set portal mode as early as possible — when this module is first imported.
// This ensures the flag is set before any lazy-loaded Lancelot components render.
// (onActivate in portal-registration.ts also sets it, but this is earlier.)
setPortalMode(true);

export { lancelotRegistration } from './portal-registration';
export { lancelotTranslations } from './i18n/portneuf-catalog';
export { lancelotFormatAdapters } from './core/parsers/portneuf-adapters';
export type { InspectionFile } from './core/models/inspection-file';
