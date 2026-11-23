import { Icon } from '../components/Icon';
import type { NavigationItem } from '../shell/navigation';
import styles from './PlaceholderPage.module.css';

interface PlaceholderPageProps {
  item: NavigationItem;
}

export function PlaceholderPage({ item }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Application shell</span>
        <h1 className={styles.title}>{item.label}</h1>
        <p className={styles.description}>{item.summary}</p>
      </header>

      <section aria-labelledby={`${item.id}-status`} className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.cardIcon}>
            <Icon name={item.icon} size={26} />
          </span>
          <span className={styles.badge}>Planned module</span>
        </div>

        <h2 className={styles.cardTitle} id={`${item.id}-status`}>
          Not connected yet
        </h2>
        <p className={styles.cardText}>
          This screen is a navigation placeholder in the Level 0 shell. The {item.owner} module is
          not connected here, so there is no data or working functionality on this page.
        </p>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Integration owner</span>
            <span className={styles.metaValue}>{item.owner}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Destination</span>
            <span className={styles.metaValue}>{item.path}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
