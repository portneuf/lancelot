import { Outlet } from 'react-router';

export function ContentArea() {
  return (
    <main className="flex-1 overflow-auto bg-background">
      <Outlet />
    </main>
  );
}
