import { NavLink } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Brand } from './Brand';
import { navigationItems } from './navigation';
import styles from './SidebarNav.module.css';

function navClassName(isActive: boolean) {
  return [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ');
}

export function SidebarNav() {
  return (
    <nav aria-label="Primary navigation" className={styles.sidebar}>
      <div className={styles.brandSlot}>
        <Brand />
      </div>

      <div className={styles.nav}>
        {navigationItems.map((item) => (
          <NavLink
            aria-label={item.label}
            className={({ isActive }) => navClassName(isActive)}
            end
            key={item.id}
            title={item.label}
            to={item.path}
          >
            <span className={styles.navIcon}>
              <Icon name={item.icon} size={20} />
            </span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerStatus}>
          <span aria-hidden="true" className={styles.statusDot} />
          <span className={styles.footerText}>Local network only</span>
        </div>
        <p className={`${styles.footerMeta} ${styles.footerText}`}>No internet required</p>
      </div>
    </nav>
  );
}
