import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { messages } from '@/locales/en/messages';

// Initialize i18n for tests
i18n.load('en', messages);
i18n.activate('en');

// Mock useMediaQuery to return desktop
vi.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: () => false,
  useIsTablet: () => false,
  useIsDesktop: () => true,
  useMediaQuery: () => false,
}));

// Must import AFTER mocks
const { NavRail } = await import('@/components/layout/NavRail');

function renderNavRail() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <NavRail />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('NavRail', () => {
  it('should render navigation groups', () => {
    renderNavRail();
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.getByText('Wafer')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('should render nav items with links', () => {
    renderNavRail();
    const openLink = screen.getByRole('link', { name: /open/i });
    expect(openLink).toHaveAttribute('href', '/file/open');

    const defectsLink = screen.getByRole('link', { name: /defects/i });
    expect(defectsLink).toHaveAttribute('href', '/inspection/defects');

    const waferMapLink = screen.getByRole('link', { name: /wafer map/i });
    expect(waferMapLink).toHaveAttribute('href', '/wafer/map');
  });

  it('should render settings link', () => {
    renderNavRail();
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('should have Lancelot branding', () => {
    renderNavRail();
    expect(screen.getByText('Lancelot')).toBeInTheDocument();
  });
});
