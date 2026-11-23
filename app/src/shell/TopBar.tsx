import { Icon } from '../components/Icon';
import { Brand } from './Brand';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <button
        aria-label="Open navigation"
        className={styles.menuButton}
        onClick={onMenuClick}
        type="button"
      >
        <Icon name="menu" size={20} />
      </button>

      <div aria-hidden="true" className={styles.mobileBrand}>
        <Brand compact />
      </div>

      <div className={styles.heading}>
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>P2P LAN Messenger</span>
      </div>

      <span aria-hidden="true" className={styles.spacer} />

      <span className={styles.badge}>
        <Icon name="shield" size={14} />
        Offline ready
      </span>
    </header>
  );
}
