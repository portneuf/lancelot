/**
 * Shared hooks for storage adapter queries via react-query.
 *
 * These hooks provide the adapter-backed data access pattern.
 * Views can incrementally migrate from useActiveFile() (file-store)
 * to these hooks for DB-backed, cached, paginated queries.
 */

import { useQuery } from '@tanstack/react-query';
import { useStorage } from '@/core/storage';
import { useFileStore } from '@/stores';
import type { DefectFilter, LotFilter, Pagination } from '@/core/storage';

/**
 * Query defects for the active wafer via the storage adapter.
 */
export function useWaferDefects(waferId: string | null, filter?: DefectFilter) {
  const storage = useStorage();
  return useQuery({
    queryKey: ['wafer-defects', waferId, filter],
    queryFn: () => storage.getWaferDefects(waferId!, filter),
    enabled: !!waferId,
  });
}

/**
 * Query the wafer map data for a specific wafer.
 */
export function useWaferMapData(waferId: string | null) {
  const storage = useStorage();
  return useQuery({
    queryKey: ['wafer-map-data', waferId],
    queryFn: () => storage.getWaferMapData(waferId!),
    enabled: !!waferId,
  });
}

/**
 * Query lot list with optional filters.
 */
export function useLotList(filter: LotFilter = {}, pagination: Pagination = { offset: 0, limit: 100 }) {
  const storage = useStorage();
  return useQuery({
    queryKey: ['lots', filter, pagination],
    queryFn: () => storage.queryLots(filter, pagination),
  });
}

/**
 * Query wafer list for a specific lot.
 */
export function useWaferList(lotId: string | null) {
  const storage = useStorage();
  return useQuery({
    queryKey: ['wafers', lotId],
    queryFn: () => storage.queryWafers(lotId!),
    enabled: !!lotId,
  });
}

/**
 * Query pareto data for the active file's lot.
 */
export function usePareto(filter: DefectFilter = {}, topN: number = 20) {
  const storage = useStorage();
  const activeFileId = useFileStore((s) => s.activeFileId);
  return useQuery({
    queryKey: ['pareto', filter, topN],
    queryFn: () => storage.getPareto(filter, topN),
    enabled: !!activeFileId,
  });
}

/**
 * Query yield summary.
 */
export function useYieldSummary(filter: LotFilter = {}) {
  const storage = useStorage();
  const activeFileId = useFileStore((s) => s.activeFileId);
  return useQuery({
    queryKey: ['yield-summary', filter],
    queryFn: () => storage.getYieldSummary(filter),
    enabled: !!activeFileId,
  });
}

/**
 * Query SPC data.
 */
export function useSPCData(metric: string, filter: LotFilter = {}) {
  const storage = useStorage();
  const activeFileId = useFileStore((s) => s.activeFileId);
  return useQuery({
    queryKey: ['spc', metric, filter],
    queryFn: () => storage.getSPCData(metric, filter),
    enabled: !!activeFileId,
  });
}

/**
 * Query trend data.
 */
export function useTrend(
  metric: 'defect-count' | 'yield' | 'defect-density' | 'cluster-count',
  filter: LotFilter = {},
  groupBy: 'lot' | 'wafer' | 'day' = 'wafer',
) {
  const storage = useStorage();
  const activeFileId = useFileStore((s) => s.activeFileId);
  return useQuery({
    queryKey: ['trend', metric, filter, groupBy],
    queryFn: () => storage.getTrend(metric, filter, groupBy),
    enabled: !!activeFileId,
  });
}

/**
 * Search lots by text query.
 */
export function useLotSearch(query: string) {
  const storage = useStorage();
  return useQuery({
    queryKey: ['lot-search', query],
    queryFn: () => storage.searchLots(query),
    enabled: query.length >= 2,
  });
}
