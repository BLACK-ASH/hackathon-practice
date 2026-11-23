import type { ReactNode } from 'react';
import styles from './PageState.module.css';

interface PageStateProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly tone?: 'neutral' | 'error';
}

export function PageState({ title, children, tone = 'neutral' }: PageStateProps) {
  return (
    <section
      className={`${styles.state} ${tone === 'error' ? styles.error : ''}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export function LoadingState() {
  return <PageState title="Loading mock data">Preparing the local preview…</PageState>;
}

export function ErrorState({ message }: { readonly message: string }) {
  return (
    <PageState title="This section could not load" tone="error">
      {message}
    </PageState>
  );
}

export function EmptyState({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <PageState title={title}>{children}</PageState>;
}
