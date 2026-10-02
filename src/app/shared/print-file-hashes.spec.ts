import { fakeAsync, tick } from '@angular/core/testing';
import { printFileHashes } from './print-file-hashes';

describe('printFileHashes', () => {
  it('prints only hashes in a separate document', fakeAsync(() => {
    const content = { textContent: '' };
    const popup = {
      document: {
        title: '',
        createElement: (tag: string) =>
          tag === 'pre' ? content : { textContent: '' },
        head: { appendChild: jasmine.createSpy('append style') },
        body: {
          innerHTML: '',
          appendChild: jasmine.createSpy('append hashes'),
        },
      },
      focus: jasmine.createSpy('focus'),
      print: jasmine.createSpy('print'),
    } as unknown as Window;
    spyOn(window, 'open').and.returnValue(popup);

    printFileHashes([{ hash: 'hash-one' }, { hash: 'hash-two' }]);
    tick(20);

    expect(content.textContent).toBe('hash-one\nhash-two');
    expect(popup.document.title).toBe('Artifact File Hashes');
    expect(popup.print).toHaveBeenCalled();
  }));

  it('does not open a window for an empty manifest', () => {
    const open = spyOn(window, 'open');
    printFileHashes([]);
    expect(open).not.toHaveBeenCalled();
  });
});
