export type Theme = 'light' | 'dark' | 'high-contrast' | 'cleanroom' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;
export type DatabaseMode = 'memory' | 'remote';
export interface DatabaseConnectionConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
}
export interface SettingsState {
    theme: Theme;
    locale: string;
    navRailExpanded: boolean;
    tablePageSize: number;
    recentFilesMaxCount: number;
    databaseMode: DatabaseMode;
    databaseConfig: DatabaseConnectionConfig;
    setTheme: (theme: Theme) => void;
    setLocale: (locale: string) => void;
    setNavRailExpanded: (expanded: boolean) => void;
    setTablePageSize: (size: number) => void;
    setDatabaseMode: (mode: DatabaseMode) => void;
    setDatabaseConfig: (config: Partial<DatabaseConnectionConfig>) => void;
}
export declare const useSettingsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SettingsState>, "setState" | "persist"> & {
    setState(partial: SettingsState | Partial<SettingsState> | ((state: SettingsState) => SettingsState | Partial<SettingsState>), replace?: false | undefined): unknown;
    setState(state: SettingsState | ((state: SettingsState) => SettingsState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsState) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsState, unknown, unknown>>;
    };
}>;
