import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { MobileDrawer } from './MobileDrawer';
import { MobileNav } from './MobileNav';
import { SidebarNav } from './SidebarNav';
import { TopBar } from './TopBar';
import { navigationItems } from './navigation';
import styles from './AppShell.module.css';

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const activeItem = navigationItems.find((item) => item.path === location.pathname);

  useEffect(() => {
    closeDrawer();
  }, [closeDrawer, location.pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  return (
    <div className={styles.shell}>
      <button
        className={styles.skipLink}
        onClick={() => mainRef.current?.focus()}
        type="button"
      >
        Skip to content
      </button>

      <SidebarNav />

      <div className={styles.workspace}>
        <TopBar onMenuClick={openDrawer} title={activeItem?.label ?? 'LAN Messenger'} />
        <main className={styles.main} id="main-content" ref={mainRef} tabIndex={-1}>
          {children}
        </main>
      </div>

      <MobileNav />
      {drawerOpen && <MobileDrawer onClose={closeDrawer} />}
    </div>
  );
}
