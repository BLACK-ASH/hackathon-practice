import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ChatsPage } from './pages/ChatsPage';
import { GroupsPage } from './pages/GroupsPage';
import { NearbyPage } from './pages/NearbyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransfersPage } from './pages/TransfersPage';
import { AppShell } from './shell/AppShell';
import { defaultRoute } from './shell/navigation';

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<Navigate replace to={defaultRoute} />} />
        <Route element={<ChatsPage />} path="/chats" />
        <Route element={<NearbyPage />} path="/nearby" />
        <Route element={<GroupsPage />} path="/groups" />
        <Route element={<TransfersPage />} path="/transfers" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
