import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'high-contrast' | 'cleanroom' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

export interface SettingsState {
  theme: Theme;
  locale: string;
  navRailExpanded: boolean;
  tablePageSize: number;
  recentFilesMaxCount: number;

  setTheme: (theme: Theme) => void;
  setLocale: (locale: string) => void;
  setNavRailExpanded: (expanded: boolean) => void;
  setTablePageSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: 'en',
      navRailExpanded: true,
      tablePageSize: 50,
      recentFilesMaxCount: 10,

      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setNavRailExpanded: (expanded) => set({ navRailExpanded: expanded }),
      setTablePageSize: (size) => set({ tablePageSize: size }),
    }),
    {
      name: 'lancelot-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        navRailExpanded: state.navRailExpanded,
        tablePageSize: state.tablePageSize,
        recentFilesMaxCount: state.recentFilesMaxCount,
      }),
    },
  ),
);
