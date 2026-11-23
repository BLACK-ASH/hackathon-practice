import { Icon } from '../components/Icon';
import styles from './Brand.module.css';

interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className={styles.brand}>
      <span className={styles.mark}>
        <Icon name="chat" size={21} />
      </span>
      {!compact && (
        <span className={styles.text}>
          <strong className={styles.name}>LAN Messenger</strong>
          <span className={styles.tagline}>Local. Private. Offline.</span>
        </span>
      )}
    </div>
  );
}
