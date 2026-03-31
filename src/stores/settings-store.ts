import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getIsPortalMode } from '@/i18n/mode-flag';

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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: 'en',
      navRailExpanded: true,
      tablePageSize: 50,
      recentFilesMaxCount: 10,
      databaseMode: 'memory',
      databaseConfig: {
        host: 'localhost',
        port: 5432,
        database: 'lancelot',
        user: 'lancelot',
        password: '',
        ssl: false,
      },

      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setNavRailExpanded: (expanded) => set({ navRailExpanded: expanded }),
      setTablePageSize: (size) => set({ tablePageSize: size }),
      setDatabaseMode: (mode) => set({ databaseMode: mode }),
      setDatabaseConfig: (config) =>
        set((state) => ({
          databaseConfig: { ...state.databaseConfig, ...config },
        })),
    }),
    {
      name: 'lancelot-settings',
      storage: createJSONStorage(() => {
        // In portal mode, use no-op storage (Portal manages theme/locale)
        if (getIsPortalMode()) {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        navRailExpanded: state.navRailExpanded,
        tablePageSize: state.tablePageSize,
        recentFilesMaxCount: state.recentFilesMaxCount,
        databaseMode: state.databaseMode,
        databaseConfig: state.databaseConfig,
      }),
    },
  ),
);
