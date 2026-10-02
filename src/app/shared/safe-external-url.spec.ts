import { safeExternalUrl } from './safe-external-url';

describe('safeExternalUrl', () => {
  it('allows HTTPS links without embedded credentials', () => {
    expect(safeExternalUrl('https://zenodo.org/records/123')).toBe(
      'https://zenodo.org/records/123',
    );
  });

  it('rejects script, data, HTTP, disguised, and malformed links', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'http://example.org',
      'https://user:pass@example.org',
      'https://example.org\\@evil.example',
      'https://example.org\n.evil.example',
      'https://',
    ]) {
      expect(safeExternalUrl(value)).withContext(value).toBeNull();
    }
  });
});
