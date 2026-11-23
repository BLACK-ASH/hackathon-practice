export function groupPath(groupId: string): string {
  return `/groups/${encodeURIComponent(groupId)}`;
}
