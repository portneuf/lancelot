import { describe, it, expect, beforeEach } from 'vitest';
import { useInspectionStore } from '@/stores/inspection-store';

describe('inspection-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useInspectionStore.getState();
    store.clearFilters();
    store.resetSelection();
    store.setFilteredDefectIds(null);
  });

  describe('filters', () => {
    it('should start with empty filters', () => {
      const { filters } = useInspectionStore.getState();
      expect(filters.classNumbers.size).toBe(0);
      expect(filters.searchText).toBe('');
      expect(Object.keys(filters.numericRanges)).toHaveLength(0);
    });

    it('should update class filter', () => {
      useInspectionStore.getState().updateFilters({
        classNumbers: new Set([1, 3]),
      });
      const { filters } = useInspectionStore.getState();
      expect(filters.classNumbers.has(1)).toBe(true);
      expect(filters.classNumbers.has(3)).toBe(true);
      expect(filters.classNumbers.has(2)).toBe(false);
    });

    it('should update numeric ranges', () => {
      useInspectionStore.getState().updateFilters({
        numericRanges: { size: [10, 200], xAbs: [0, 150000] },
      });
      const { filters } = useInspectionStore.getState();
      expect(filters.numericRanges['size']).toEqual([10, 200]);
      expect(filters.numericRanges['xAbs']).toEqual([0, 150000]);
    });

    it('should update search text', () => {
      useInspectionStore.getState().updateFilters({ searchText: 'particle' });
      expect(useInspectionStore.getState().filters.searchText).toBe('particle');
    });

    it('should clear all filters', () => {
      useInspectionStore.getState().updateFilters({
        classNumbers: new Set([1]),
        searchText: 'test',
        numericRanges: { size: [10, 100] },
      });
      useInspectionStore.getState().clearFilters();
      const { filters } = useInspectionStore.getState();
      expect(filters.classNumbers.size).toBe(0);
      expect(filters.searchText).toBe('');
      expect(Object.keys(filters.numericRanges)).toHaveLength(0);
    });

    it('should merge partial updates', () => {
      useInspectionStore.getState().updateFilters({ searchText: 'hello' });
      useInspectionStore.getState().updateFilters({ classNumbers: new Set([2]) });
      const { filters } = useInspectionStore.getState();
      expect(filters.searchText).toBe('hello');
      expect(filters.classNumbers.has(2)).toBe(true);
    });
  });

  describe('selection', () => {
    it('should select defects', () => {
      useInspectionStore.getState().selectDefects([1, 5, 10]);
      const { selectedDefectIds } = useInspectionStore.getState();
      expect(selectedDefectIds.size).toBe(3);
      expect(selectedDefectIds.has(5)).toBe(true);
    });

    it('should highlight a defect', () => {
      useInspectionStore.getState().highlightDefect(42);
      expect(useInspectionStore.getState().highlightedDefectId).toBe(42);
    });

    it('should reset selection', () => {
      useInspectionStore.getState().selectDefects([1, 2]);
      useInspectionStore.getState().highlightDefect(3);
      useInspectionStore.getState().resetSelection();

      const state = useInspectionStore.getState();
      expect(state.selectedDefectIds.size).toBe(0);
      expect(state.highlightedDefectId).toBeNull();
      expect(state.hoveredDie).toBeNull();
    });
  });

  describe('filteredDefectIds', () => {
    it('should start as null (no filter active)', () => {
      expect(useInspectionStore.getState().filteredDefectIds).toBeNull();
    });

    it('should set filtered defect IDs', () => {
      const ids = new Set([1, 3, 5, 7]);
      useInspectionStore.getState().setFilteredDefectIds(ids);
      expect(useInspectionStore.getState().filteredDefectIds).toBe(ids);
      expect(useInspectionStore.getState().filteredDefectIds!.size).toBe(4);
    });

    it('should clear filtered defect IDs', () => {
      useInspectionStore.getState().setFilteredDefectIds(new Set([1]));
      useInspectionStore.getState().setFilteredDefectIds(null);
      expect(useInspectionStore.getState().filteredDefectIds).toBeNull();
    });
  });
});
