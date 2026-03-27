import { useSettingsStore } from '@/stores';
import type { Theme } from '@/stores/settings-store';

const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'high-contrast', label: 'High Contrast' },
  { value: 'cleanroom', label: 'Cleanroom' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
];

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      <div className="flex flex-col gap-8">
        {/* Theme */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Theme</h2>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  theme === t.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Language</h2>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <button
                key={l.value}
                onClick={() => setLocale(l.value)}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  locale === l.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">About</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">Lancelot v0.1.0</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Semiconductor inspection file viewer. Supports KLARF format.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
