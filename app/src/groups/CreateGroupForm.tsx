import type { ErrorInfo } from '#contracts/errors.ts';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toUiErrorInfo } from '../integration/errors.ts';
import { useMessenger } from '../integration/MessengerProvider.tsx';
import {
  availabilityLabel,
  deviceLabel,
  platformLabel,
} from '../peers/peerStatus.ts';
import { groupPath } from './groupPath.ts';
import styles from './Group.module.css';

export function CreateGroupForm() {
  const navigate = useNavigate();
  const { createGroup, identity, peers } = useMessenger();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<ErrorInfo | undefined>();

  const availablePeers = useMemo(
    () =>
      peers.filter(
        (peer) => peer.peerId !== identity?.peerId && peer.availability !== 'offline',
      ),
    [identity?.peerId, peers],
  );
  const unavailablePeers = useMemo(
    () =>
      peers.filter(
        (peer) => peer.peerId !== identity?.peerId && peer.availability === 'offline',
      ),
    [identity?.peerId, peers],
  );

  function toggleMember(peerId: string) {
    setSelectedIds((current) =>
      current.includes(peerId)
        ? current.filter((id) => id !== peerId)
        : [...current, peerId],
    );
    if (formError !== undefined) setFormError(undefined);
  }

  async function submit() {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setFormError(
        toUiErrorInfo(new Error('Enter a group name.'), 'Enter a group name.'),
      );
      return;
    }
    if (selectedIds.length === 0) {
      setFormError(
        toUiErrorInfo(
          new Error('Select at least one nearby peer.'),
          'Select at least one nearby peer.',
        ),
      );
      return;
    }

    setCreating(true);
    setFormError(undefined);
    try {
      const group = await createGroup({ name: trimmedName, memberIds: selectedIds });
      navigate(groupPath(group.id));
    } catch (reason: unknown) {
      setFormError(toUiErrorInfo(reason, 'Group could not be created.'));
    } finally {
      setCreating(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <form aria-labelledby="create-group-heading" className={styles.createForm} onSubmit={handleSubmit}>
      <div className={styles.headerRow}>
        <h2 id="create-group-heading">New group</h2>
        <p>Choose nearby peers and give the group a name.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="group-name">Group name</label>
        <input
          id="group-name"
          maxLength={60}
          onChange={(event) => {
            setName(event.target.value);
            if (formError !== undefined) setFormError(undefined);
          }}
          placeholder="e.g. Weekend Hikers"
          type="text"
          value={name}
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Add nearby peers</legend>
        {availablePeers.length === 0 && (
          <p className={styles.readOnly}>No nearby peers are available right now.</p>
        )}
        {availablePeers.length > 0 && (
          <ul className={styles.memberOptions}>
            {availablePeers.map((peer) => (
              <li className={styles.memberOption} key={peer.peerId}>
                <label>
                  <input
                    aria-label={peer.displayName}
                    checked={selectedIds.includes(peer.peerId)}
                    onChange={() => toggleMember(peer.peerId)}
                    type="checkbox"
                  />
                  <span className={styles.memberName}>{peer.displayName}</span>
                  <span className={styles.memberMeta}>
                    {deviceLabel(peer)} · {platformLabel(peer.platform)} ·{' '}
                    {availabilityLabel(peer.availability)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {unavailablePeers.map((peer) => (
          <label className={`${styles.memberOption} ${styles.memberOptionDisabled}`} key={peer.peerId}>
            <input aria-label={peer.displayName} disabled type="checkbox" />
            <span className={styles.memberName}>{peer.displayName}</span>
            <span className={styles.memberMeta}>Offline</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.actions}>
        <button className={styles.button} disabled={creating} type="submit">
          {creating ? 'Creating…' : 'Create group'}
        </button>
        <span className={styles.selectionCount}>
          {selectedIds.length} {selectedIds.length === 1 ? 'peer' : 'peers'} selected
        </span>
      </div>

      {formError && (
        <p className={styles.error} role="alert">
          {formError.message}
        </p>
      )}
    </form>
  );
}
