export function printFileHashes(files: ReadonlyArray<{ hash: string }>): void {
  if (!files.length) return;

  const hashes = files.map((file) => file.hash).join('\n');
  const popup = window.open('', '_blank');
  if (!popup) {
    window.alert('Please allow pop-ups to print the manifest.');
    return;
  }

  const doc = popup.document;
  doc.title = 'Artifact File Hashes';

  if (doc.head && doc.body && typeof doc.createElement === 'function') {
    const style = doc.createElement('style');
    style.textContent =
      'body { font-family: monospace; margin: 16px; } pre { white-space: pre-wrap; overflow-wrap: anywhere; }';
    doc.head.appendChild(style);

    const content = doc.createElement('pre');
    content.textContent = hashes;
    doc.body.innerHTML = '';
    doc.body.appendChild(content);
  } else {
    const escaped = hashes.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const html = `<!doctype html><html><head><title>Artifact File Hashes</title><style>body { font-family: monospace; white-space: pre-wrap; overflow-wrap: anywhere; margin: 16px; }</style></head><body>${escaped}</body></html>`;
    if (typeof doc.open === 'function') doc.open();
    if (typeof doc.write === 'function') doc.write(html);
    if (typeof doc.close === 'function') doc.close();
  }

  setTimeout(() => {
    if (typeof popup.focus === 'function') popup.focus();
    if (typeof popup.print === 'function') popup.print();
  }, 10);
}
