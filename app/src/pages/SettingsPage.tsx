import type { ErrorInfo } from '#contracts/errors.ts';
import type { ModuleHealthReport, ModuleStatus } from '#contracts/lifecycle.ts';
import { useEffect, useState, type FormEvent } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { toUiErrorInfo } from '../integration/errors.ts';
import { useMessenger } from '../integration/MessengerProvider';
import styles from './DataPages.module.css';

const moduleLabels: Readonly<Record<string, string>> = {
  core: 'Core services',
  network: 'Nearby devices',
  storage: 'Local data',
  messaging: 'Chats',
  groups: 'Groups',
  'file-transfer': 'File transfers',
};

const statusLabels: Readonly<Record<ModuleStatus, string>> = {
  registered: 'Registered',
  starting: 'Starting',
  ready: 'Ready',
  degraded: 'Limited',
  failed: 'Unavailable',
  stopped: 'Stopped',
};

export function SettingsPage() {
  const { state, error, identity, health, isMock, updateDisplayName } = useMessenger();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ErrorInfo | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (identity) setDisplayName(identity.displayName);
  }, [identity]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setFormError(undefined);
    try {
      await updateDisplayName(displayName);
      setSaved(true);
    } catch (reason: unknown) {
      setFormError(toUiErrorInfo(reason, 'Display name could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  function healthLabel(report: ModuleHealthReport): string {
    return moduleLabels[report.moduleId] ?? report.moduleId;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p>Local identity and module availability.</p>
      </header>

      {isMock && (
        <div className={styles.notice}>
          Mock storage from Core. Profile changes last for this session only and are not saved to
          disk.
        </div>
      )}

      {state === 'loading' && <LoadingState />}
      {state === 'error' && (
        <ErrorState message={error?.message ?? 'Settings could not be read.'} />
      )}

      {state === 'ready' && identity && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Your profile</h2>
          <p className={styles.meta}>
            {identity.deviceName ?? 'This device'} · local identity created on first launch
          </p>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="display-name">Display name</label>
              <input
                id="display-name"
                maxLength={60}
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </div>
            <button className={styles.button} disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </form>
          <p aria-live="polite" className={styles.meta}>
            {formError?.message ??
              (saved ? (isMock ? 'Display name updated in the mock session.' : 'Display name updated.') : '')}
          </p>
        </section>
      )}

      {state === 'ready' && !identity && (
        <EmptyState title="No local identity">The profile could not be loaded.</EmptyState>
      )}

      {state === 'ready' && health.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Module availability</h2>
          <div className={styles.healthGrid}>
            {health.map((report) => (
              <div className={styles.healthRow} key={report.moduleId}>
                <span>{healthLabel(report)}</span>
                <span
                  className={`${styles.badge} ${report.status === 'ready' ? '' : styles.badgeMuted}`}
                >
                  {statusLabels[report.status]}
                </span>
              </div>
            ))}
          </div>
          {isMock && (
            <p className={styles.meta}>Availability values shown here come from the mock facade.</p>
          )}
        </section>
      )}
    </section>
  );
}
