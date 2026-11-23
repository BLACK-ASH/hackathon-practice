import type { IconName } from '../components/Icon';

export interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: IconName;
  owner: string;
  summary: string;
}

export const defaultRoute = '/chats';

export const navigationItems: NavigationItem[] = [
  {
    id: 'chats',
    label: 'Chats',
    shortLabel: 'Chats',
    path: '/chats',
    icon: 'chat',
    owner: 'Messaging Engine',
    summary: 'Private conversations and locally stored message history.',
  },
  {
    id: 'nearby',
    label: 'Nearby Devices',
    shortLabel: 'Nearby',
    path: '/nearby',
    icon: 'devices',
    owner: 'Network Core',
    summary: 'Automatic discovery of other devices on the same local network.',
  },
  {
    id: 'groups',
    label: 'Groups',
    shortLabel: 'Groups',
    path: '/groups',
    icon: 'users',
    owner: 'Group System',
    summary: 'Group conversations distributed over direct peer connections.',
  },
  {
    id: 'transfers',
    label: 'File Transfers',
    shortLabel: 'Files',
    path: '/transfers',
    icon: 'transfer',
    owner: 'File Transfer',
    summary: 'Direct file sharing with progress, validation, and cancellation.',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    path: '/settings',
    icon: 'settings',
    owner: 'Core & Local Storage',
    summary: 'Local identity, preferences, and application information.',
  },
];
