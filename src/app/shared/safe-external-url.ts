export function safeExternalUrl(value: string): string | null {
  if (!value.startsWith('https://') || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
