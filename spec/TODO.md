# Lancelot - Open Items

## Priority 1: Core Gaps

- [x] **KLARF v1.8 Parser**: Hierarchical Record/Field/List parser with brace-nesting, column-count-based row splitting
- [x] **i18n Catalogs ja/ko/zh**: Japanese, Korean, Chinese translation catalogs with all UI strings
- [x] **Route Guards**: `routes/guards.tsx` redirects to `/file/open` when no file loaded

## Priority 2: Missing Files from Plan

- [x] **useDebounce Hook**: `src/hooks/useDebounce.ts`
- [x] **Tauri Custom TitleBar**: `src/components/layout/TitleBar.tsx` with drag region, window controls
- [ ] **Tauri file_commands.rs**: IPC commands for native file operations (deferred - platform layer handles this via JS API)
- [x] **GitHub Actions deploy.yml**: Railway auto-deploy workflow
- [x] **GitHub Actions tauri-build.yml**: Matrix build for Windows/macOS/Linux

## Priority 3: Testing

- [x] **E2E Tests (Playwright)**: Setup + tests for file open, navigation, theme switching, data display
- [ ] **Component Tests**: Vitest + Testing Library tests for NavRail, DefectTable, WaferMap
- [ ] **Parser Edge Cases**: Tests for malformed KLARF, missing sections, very large files

## Priority 4: Polish

- [ ] **Streaming Parser**: Chunked parsing for files >100MB
- [ ] **Mobile Layout Tuning**: Dedicated mobile layouts for WaferMap, DefectTable, charts
- [x] **Defect Filtering UI**: DefectFilterBar with class/size/search filters wired to inspection-store
