import { Navigate, Outlet } from 'react-router';
import { useFileStore } from '@/stores';

/**
 * Route guard that redirects to /file/open when no file is loaded.
 * Wrap route groups that require an active file.
 */
export function RequireFile() {
  const activeFileId = useFileStore((s) => s.activeFileId);
  if (!activeFileId) {
    return <Navigate to="/file/open" replace />;
  }
  return <Outlet />;
}
