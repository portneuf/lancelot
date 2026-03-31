/**
 * Database connection settings section.
 *
 * Allows switching between in-memory mode and PostgreSQL,
 * configuring connection parameters, and testing the connection.
 */

import { useCallback, useState } from 'react';
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSettingsStore } from '@/stores';
import { useTranslation } from '@/i18n/useTranslation';
import { useStorage } from '@/core/storage';
import type { DatabaseMode } from '@/stores/settings-store';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function DatabaseSettings() {
  const { t } = useTranslation();
  const databaseMode = useSettingsStore((s) => s.databaseMode);
  const databaseConfig = useSettingsStore((s) => s.databaseConfig);
  const setDatabaseMode = useSettingsStore((s) => s.setDatabaseMode);
  const setDatabaseConfig = useSettingsStore((s) => s.setDatabaseConfig);
  const storage = useStorage();

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string>('');

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing');
    setTestError('');

    try {
      // Dynamic import to avoid bundling postgres in the main chunk
      const { PostgresStorageAdapter } = await import('@/core/storage/postgres-storage-adapter');
      const adapter = new PostgresStorageAdapter();
      await adapter.connect({
        type: 'remote',
        ...databaseConfig,
      });
      await adapter.migrate();
      await adapter.disconnect();
      setTestStatus('success');
    } catch (err) {
      setTestStatus('error');
      setTestError(err instanceof Error ? err.message : String(err));
    }
  }, [databaseConfig]);

  const modes: { value: DatabaseMode; label: string; desc: string }[] = [
    { value: 'memory', label: t('db.modeMemory'), desc: t('db.modeMemoryDesc') },
    { value: 'remote', label: t('db.modeRemote'), desc: t('db.modeRemoteDesc') },
  ];

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Database className="h-4 w-4" />
        {t('db.title')}
      </h2>

      {/* Mode selection */}
      <div className="flex flex-col gap-2">
        {modes.map((m) => (
          <label
            key={m.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
              databaseMode === m.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40',
            )}
          >
            <input
              type="radio"
              name="db-mode"
              checked={databaseMode === m.value}
              onChange={() => setDatabaseMode(m.value)}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-medium">{m.label}</span>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Connection config (only when remote) */}
      {databaseMode === 'remote' && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('db.host')}</label>
              <input
                type="text"
                value={databaseConfig.host}
                onChange={(e) => setDatabaseConfig({ host: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('db.port')}</label>
              <input
                type="number"
                value={databaseConfig.port}
                onChange={(e) => setDatabaseConfig({ port: Number(e.target.value) })}
                className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('db.database')}</label>
            <input
              type="text"
              value={databaseConfig.database}
              onChange={(e) => setDatabaseConfig({ database: e.target.value })}
              className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('db.user')}</label>
              <input
                type="text"
                value={databaseConfig.user}
                onChange={(e) => setDatabaseConfig({ user: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('db.password')}</label>
              <input
                type="password"
                value={databaseConfig.password}
                onChange={(e) => setDatabaseConfig({ password: e.target.value })}
                className="w-full rounded border border-border bg-card px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={databaseConfig.ssl}
              onChange={(e) => setDatabaseConfig({ ssl: e.target.checked })}
              className="rounded border-border"
            />
            SSL
          </label>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              {testStatus === 'testing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              {t('db.testConnection')}
            </button>

            {testStatus === 'success' && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" />
                {t('db.connected')}
              </span>
            )}
            {testStatus === 'error' && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                {testError}
              </span>
            )}
          </div>

          {/* Status */}
          {storage.isConnected() && (
            <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              {t('db.activeConnection')}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
