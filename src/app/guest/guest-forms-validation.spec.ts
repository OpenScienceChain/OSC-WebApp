import { of } from 'rxjs';
import { GuestArtifactFormComponent } from './guest-artifact-form.component';
import { GuestWorkflowFormComponent } from './guest-workflow-form.component';
import { DemoCatalogArtifact } from './demo.models';

describe('Guest portal form boundaries', () => {
  it('shows the original metadata format checks on blur', () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    form.keywords = 'science,,analysis';
    expect(form.fieldError('keywords')).toContain('empty entries');
    form.links = 'http://example.com';
    expect(form.fieldError('links')).toContain('HTTPS');
    form.dois = 'invalid-doi';
    expect(form.fieldError('dois')).toContain('10.xxxx');
    form.otherAgency = 'A, B';
    form.nsf = form.nih = form.noaa = form.nasa = true;
    expect(form.fieldError('otherAgency')).toContain('at most 5');
    form.markTouched('keywords');
    expect(form.touched.has('keywords')).toBeTrue();
  });

  it('hashes a folder locally without sending original names or paths', async () => {
    const demo = {
      session: { organization: 'neuroscience-gateway' },
      createArtifact: jasmine.createSpy('createArtifact').and.returnValue(of({ id: 'record-id' })),
    };
    const router = { navigate: jasmine.createSpy('navigate') };
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      router as any,
      demo as any,
      { success: jasmine.createSpy('success'), warning: jasmine.createSpy('warning') } as any,
    );
    const selected = [
      new File(['synthetic notes'], 'notes.txt', { type: 'text/plain' }),
      new File(['{"synthetic":true}'], 'observations.json', { type: 'application/json' }),
    ];
    await form.onDrop({ preventDefault() {}, dataTransfer: { files: selected } } as any);
    expect(form.selectedFiles.length).toBe(2);
    expect(form.extension).toBe('bundle');
    expect(form.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    form.status = { state: 'OPEN' } as any;
    form.title = 'Synthetic folder artifact';
    form.description = 'This synthetic record checks the folder upload request without transmitting local file names.';
    form.submissionComment = 'Initial synthetic folder contribution.';
    form.submit();
    const request = demo.createArtifact.calls.mostRecent().args[0];
    expect(request.files.length).toBe(2);
    expect(request.files[0]).toEqual(jasmine.objectContaining({ hash: jasmine.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(JSON.stringify(request)).not.toContain('notes.txt');
    expect(JSON.stringify(request)).not.toContain('observations.json');
    expect(router.navigate).toHaveBeenCalledWith(['/artifacts', 'record-id']);
  });

  it('keeps file-count errors beside the file picker', async () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      { warning: jasmine.createSpy('warning') } as any,
    );
    const files = Array.from({ length: 51 }, (_, index) =>
      new File(['x'], `record-${index}.txt`, { type: 'text/plain' }));
    await form.onDrop({ preventDefault() {}, dataTransfer: { files } } as any);
    expect(form.fileError).toBe('Choose at most 50 files.');
    expect(form.error).toBe('');
    expect(form.selectedFiles).toEqual([]);
    form.resetFiles();
    expect(form.fileError).toBe('');
  });

  it('lists only confirmed artifacts from the selected organization', () => {
    const organization = 'neuroscience-gateway' as const;
    const artifact = (id: string, organizationSlug: 'neuroscience-gateway' | 'citizen-science', submissionState: string): DemoCatalogArtifact => ({
      id, organizationSlug, submissionState, title: id,
      description: 'Synthetic test artifact', organization: organizationSlug,
      contributorAlias: 'test', researchContext: null, verified: true,
      submittedAt: new Date().toISOString(),
    });
    const records = [
      artifact('same-org', organization, 'SUCCESS'),
      artifact('pending', organization, 'PENDING'),
      artifact('other-org', 'citizen-science', 'SUCCESS'),
    ];
    const demo = {
      session: { organization },
      listArtifacts: jasmine.createSpy('listArtifacts').and.returnValue(of(records)),
    };
    const form = new GuestWorkflowFormComponent(demo as any, {} as any, {} as any);
    form.loadArtifacts();
    expect(demo.listArtifacts).toHaveBeenCalledWith(organization);
    expect(form.matchingArtifacts.map((item) => item.id)).toEqual(['same-org']);
    form.selectArtifact('same-org');
    expect(form.selectedArtifacts.map((item) => item.id)).toEqual(['same-org']);
  });
});
