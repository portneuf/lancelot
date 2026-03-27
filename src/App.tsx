import { RouterProvider } from 'react-router';
import { router } from '@/routes';
import { ThemeProvider } from '@/theme/theme-provider';
import { PlatformProvider } from '@/platform/platform-provider';

export default function App() {
  return (
    <ThemeProvider>
      <PlatformProvider>
        <RouterProvider router={router} />
      </PlatformProvider>
    </ThemeProvider>
  );
}
