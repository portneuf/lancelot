/**
 * Bridges Lancelot's FileFormatAdapter to @portneuf/plugin-system's FormatAdapter<T>.
 *
 * This file creates wrapper adapters that conform to the Portal's
 * FormatAdapter interface while delegating to Lancelot's existing parsers.
 * No existing parser code is modified.
 */
import type { FormatAdapter } from '@portneuf/plugin-system';
import type { InspectionFile } from '../models/inspection-file';
export declare const lancelotFormatAdapters: FormatAdapter<InspectionFile>[];
