import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { router } from '@/routes';
import { ThemeProvider } from '@/theme/theme-provider';
import { PlatformProvider } from '@/platform/platform-provider';
import { ToastContainer } from '@/components/shared/Toast';
import { detectLocale, dynamicActivate } from '@/i18n/i18n';

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const locale = detectLocale();
    dynamicActivate(locale).then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) return null;

  return (
    <I18nProvider i18n={i18n}>
      <ThemeProvider>
        <PlatformProvider>
          <RouterProvider router={router} />
          <ToastContainer />
        </PlatformProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
