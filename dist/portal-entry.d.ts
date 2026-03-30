/**
 * Portal entry point — the public API of @portneuf/tool-lancelot.
 *
 * This is what the Portal imports when loading Lancelot as a tool:
 *
 *   import { lancelotRegistration, lancelotTranslations, lancelotFormatAdapters }
 *     from '@portneuf/tool-lancelot';
 */
import './theme/themes.css';
import './theme/portal-theme-bridge.css';
import './theme/lancelot-domain-tokens.css';
export { lancelotRegistration } from './portal-registration';
export { lancelotTranslations } from './i18n/portneuf-catalog';
export { lancelotFormatAdapters } from './core/parsers/portneuf-adapters';
export type { InspectionFile } from './core/models/inspection-file';
