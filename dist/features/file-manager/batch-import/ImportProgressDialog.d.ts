/**
 * Batch import dialog — directory picker + progress + result report.
 *
 * Flow:
 * 1. User clicks "Batch Import" → directory picker opens
 * 2. Files are scanned and listed
 * 3. Sequential parsing with progress bar
 * 4. Result report: succeeded/failed/total + error details
 */
export declare function ImportProgressDialog(): import("react/jsx-runtime").JSX.Element;
