import { NavLink } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { navigationItems } from './navigation';
import styles from './MobileNav.module.css';

function navClassName(isActive: boolean) {
  return [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ');
}

export function MobileNav() {
  return (
    <nav aria-label="Mobile navigation" className={styles.mobileNav}>
      {navigationItems.map((item) => (
        <NavLink
          aria-label={item.label}
          className={({ isActive }) => navClassName(isActive)}
          end
          key={item.id}
          to={item.path}
        >
          <Icon name={item.icon} size={20} />
          <span className={styles.label}>{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}
