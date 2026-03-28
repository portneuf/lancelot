import { useTheme } from '@/theme/theme-provider';
import { useSettingsStore } from '@/stores';
import { dynamicActivate, supportedLocales } from '@/i18n/i18n';
import type { Theme } from '@/theme/theme-provider';
import type { SupportedLocale } from '@/i18n/i18n';

const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'high-contrast', label: 'High Contrast' },
  { value: 'cleanroom', label: 'Cleanroom' },
];

const languages = Object.entries(supportedLocales).map(([value, label]) => ({
  value: value as SupportedLocale,
  label,
}));

export default function SettingsPage() {
  // Theme: use ThemeProvider's hook (actually applies the class to <html>)
  const { theme, setTheme } = useTheme();

  // Locale: use settings-store for persistence + dynamicActivate for runtime
  const locale = useSettingsStore((s) => s.locale);
  const setLocaleStore = useSettingsStore((s) => s.setLocale);

  const handleLocaleChange = async (newLocale: SupportedLocale) => {
    setLocaleStore(newLocale);
    localStorage.setItem('lancelot-locale', newLocale);
    await dynamicActivate(newLocale);
  };

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
                onClick={() => handleLocaleChange(l.value)}
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
            <p className="text-sm font-semibold">Lancelot v0.4.0</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Semiconductor inspection file viewer. Supports KLARF and SINF formats.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
