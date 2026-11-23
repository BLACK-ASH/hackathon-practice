import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { defaultRoute } from '../shell/navigation';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.description}>
        There is no screen at this address. Choose a destination from the navigation to continue.
      </p>
      <Link className={styles.button} to={defaultRoute}>
        <Icon name="arrowLeft" size={18} />
        Back to Chats
      </Link>
    </div>
  );
}
