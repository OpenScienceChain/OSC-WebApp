import { of, Subject } from 'rxjs';
import { GuestArtifactFormComponent } from './guest-artifact-form.component';
import { GuestWorkflowFormComponent } from './guest-workflow-form.component';
import { DemoCatalogArtifact } from './demo.models';

describe('Guest portal form boundaries', () => {
  const analytics = { track: jasmine.createSpy('track') };

  beforeEach(() => analytics.track.calls.reset());

  it('shows the original metadata format checks on blur', () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      {} as any,
      analytics as any,
    );
    form.keywords = 'science,,analysis';
    expect(form.fieldError('keywords')).toContain('empty entries');
    form.links = 'http://example.com';
    expect(form.fieldError('links')).toContain('HTTPS');
    form.links = `example.com/${'a'.repeat(381)}`;
    expect(form.fieldError('links')).toContain('no longer than 400');
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
      session: {
        organization: 'neuroscience-gateway',
        accountUsername: 'researcher',
      },
      createArtifact: jasmine
        .createSpy('createArtifact')
        .and.returnValue(of({ id: 'record-id' })),
    };
    const router = { navigate: jasmine.createSpy('navigate') };
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      router as any,
      demo as any,
      {
        success: jasmine.createSpy('success'),
        warning: jasmine.createSpy('warning'),
      } as any,
      analytics as any,
    );
    const selected = [
      new File(['synthetic notes'], 'notes.txt', { type: 'text/plain' }),
      new File(['{"synthetic":true}'], 'observations.json', {
        type: 'application/json',
      }),
    ];
    await form.onDrop({
      preventDefault() {},
      dataTransfer: { files: selected },
    } as any);
    expect(form.selectedFiles.length).toBe(2);
    expect(form.extension).toBe('bundle');
    expect(form.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    form.status = { state: 'OPEN' } as any;
    form.title = 'Synthetic folder artifact';
    form.description =
      'This synthetic record checks the folder upload request without transmitting local file names.';
    form.submissionComment = 'Initial synthetic folder contribution.';
    form.links = 'fb.com, ucsd.edu, youtube.com';
    expect(form.fieldError('links')).toBe('');
    form.submit();
    const request = demo.createArtifact.calls.mostRecent().args[0];
    expect(request.links).toEqual([
      'https://fb.com',
      'https://ucsd.edu',
      'https://youtube.com',
    ]);
    expect(request.researchContext).toBe('OTHER');
    expect(request.files.length).toBe(2);
    expect(request.files[0]).toEqual(
      jasmine.objectContaining({
        hash: jasmine.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
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
      analytics as any,
    );
    const files = Array.from(
      { length: 501 },
      (_, index) =>
        new File(['x'], `record-${index}.txt`, { type: 'text/plain' }),
    );
    await form.onDrop({ preventDefault() {}, dataTransfer: { files } } as any);
    expect(form.fileError).toBe('Choose at most 500 files.');
    expect(form.error).toBe('');
    expect(form.selectedFiles).toEqual([]);
    form.resetFiles();
    expect(form.fileError).toBe('');
  });

  it('accepts 500 file fingerprints and rejects selections over 50 MiB', async () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      { warning: jasmine.createSpy('warning') } as any,
      analytics as any,
    );
    spyOn<any>(form, 'sha256').and.returnValue(Promise.resolve('a'.repeat(64)));
    const files = Array.from(
      { length: 500 },
      (_, index) => new File(['x'], `record-${index}.txt`),
    );
    await form.onDrop({ preventDefault() {}, dataTransfer: { files } } as any);
    expect(form.fileError).toBe('');
    expect(form.selectedFiles.length).toBe(500);
    expect(form.sizeBytes).toBe(500);

    const oversized = new File(['x'], 'oversized.txt');
    Object.defineProperty(oversized, 'size', { value: 50 * 1024 * 1024 + 1 });
    await form.onDrop({
      preventDefault() {},
      dataTransfer: { files: [oversized] },
    } as any);
    expect(form.fileError).toBe(
      'The selected files exceed the 50 MiB total limit.',
    );
  });

  it('does not replace a retained manifest when files are dropped', async () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => 'artifact-id' } } } as any,
      {} as any,
      {} as any,
      {} as any,
      analytics as any,
    );
    form.keepManifestUnchanged = true;
    const preventDefault = jasmine.createSpy('preventDefault');
    await form.onDrop({
      preventDefault,
      dataTransfer: { files: [new File(['x'], 'record.txt')] },
    } as any);
    expect(preventDefault).toHaveBeenCalled();
    expect(form.selectedFiles).toEqual([]);
    expect(form.fingerprint).toBe('');
  });

  it('lists only confirmed artifacts from the selected organization', () => {
    const organization = 'neuroscience-gateway' as const;
    const artifact = (
      id: string,
      organizationSlug: 'neuroscience-gateway' | 'citizen-science',
      submissionState: string,
    ): DemoCatalogArtifact => ({
      id,
      organizationSlug,
      submissionState,
      title: id,
      description: 'Synthetic test artifact',
      organization: organizationSlug,
      contributorAlias: 'test',
      researchContext: null,
      verified: true,
      submittedAt: new Date().toISOString(),
    });
    const records = [
      artifact('same-org', organization, 'SUCCESS'),
      artifact('pending', organization, 'PENDING'),
      artifact('other-org', 'citizen-science', 'SUCCESS'),
    ];
    const demo = {
      session: { organization, accountUsername: 'researcher' },
      listArtifacts: jasmine
        .createSpy('listArtifacts')
        .and.returnValue(of(records)),
    };
    const form = new GuestWorkflowFormComponent(
      demo as any,
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      analytics as any,
    );
    form.loadArtifacts();
    expect(demo.listArtifacts).toHaveBeenCalledWith(organization);
    expect(form.matchingArtifacts.map((item) => item.id)).toEqual(['same-org']);
    form.selectArtifact('same-org');
    expect(form.selectedArtifacts.map((item) => item.id)).toEqual(['same-org']);
  });

  it('keeps the current manifest only when the explicit revision switch is on', () => {
    const demo = {
      session: {
        organization: 'neuroscience-gateway',
        accountUsername: 'researcher',
      },
      updateArtifact: jasmine
        .createSpy('updateArtifact')
        .and.returnValue(of({ id: 'artifact-1' })),
    };
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => 'artifact-1' } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      demo as any,
      {
        success: jasmine.createSpy('success'),
        warning: jasmine.createSpy('warning'),
      } as any,
      analytics as any,
    );
    form.status = { state: 'OPEN' } as any;
    form.baseline = {
      id: 'artifact-1',
      footprint: 'a'.repeat(64),
      keywords: [],
      links: [],
      dois: [],
      fundingAgencies: [],
    } as any;
    form.submissionComment =
      'A meaningful metadata revision for this artifact.';
    form.keywords = 'provenance';
    expect(form.canSubmit).toBeFalse();
    form.keepManifestUnchanged = true;
    expect(form.canSubmit).toBeTrue();
    form.submit();
    const request = demo.updateArtifact.calls.mostRecent().args[1];
    expect(request.keywords).toEqual(['provenance']);
    expect(request.fingerprint).toBeUndefined();
    expect(request.files).toBeUndefined();
  });

  it('requires a changed file or metadata for a replacement revision', () => {
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => 'artifact-1' } } } as any,
      {} as any,
      { session: { accountUsername: 'researcher' } } as any,
      {} as any,
      analytics as any,
    );
    form.status = { state: 'OPEN' } as any;
    form.baseline = { footprint: 'a'.repeat(64) } as any;
    form.submissionComment = 'A meaningful file revision for this artifact.';
    form.fingerprint = 'a'.repeat(64);
    expect(form.canSubmit).toBeFalse();
    form.fingerprint = 'b'.repeat(64);
    expect(form.canSubmit).toBeTrue();
    form.keepManifestUnchanged = true;
    form.onManifestChoice();
    expect(form.fingerprint).toBe('');
    expect(form.canSubmit).toBeFalse();
  });

  it('records artifact form stages only with template routes and accepted responses', () => {
    const response = new Subject<{ id: string }>();
    const demo = {
      session: { accountUsername: 'researcher' },
      createArtifact: jasmine
        .createSpy('createArtifact')
        .and.returnValue(response.asObservable()),
    };
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      demo as any,
      { success: jasmine.createSpy('success') } as any,
      analytics as any,
    );
    form.status = { state: 'OPEN' } as any;
    form.title = 'Synthetic artifact';
    form.description =
      'A synthetic artifact description with enough characters for the form.';
    form.submissionComment = 'A synthetic submission comment.';
    form.fingerprint = 'a'.repeat(64);
    form.markTouched('title');
    form.formAnalytics.start();
    form.links = 'http://example.com';
    form.markTouched('links');
    form.markTouched('links');
    form.links = '';

    form.submit();
    expect(demo.createArtifact).toHaveBeenCalledTimes(1);
    expect(analytics.track.calls.allArgs()).toEqual([
      ['FORM_START', '/contribute'],
      ['VALIDATION_ERROR', '/contribute'],
      ['SUBMISSION_ATTEMPT', '/contribute'],
    ]);

    response.next({ id: 'record-id' });
    expect(analytics.track.calls.mostRecent().args).toEqual([
      'ARTIFACT_SUBMITTED',
      '/contribute',
    ]);
  });

  it('does not count a rejected artifact request as submitted', () => {
    const response = new Subject<{ id: string }>();
    const form = new GuestArtifactFormComponent(
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {
        session: { accountUsername: 'researcher' },
        createArtifact: () => response.asObservable(),
      } as any,
      { error: jasmine.createSpy('error') } as any,
      analytics as any,
    );
    form.status = { state: 'OPEN' } as any;
    form.title = 'Synthetic artifact';
    form.description =
      'A synthetic artifact description with enough characters for the form.';
    form.submissionComment = 'A synthetic submission comment.';
    form.fingerprint = 'a'.repeat(64);
    form.submit();
    response.error({ status: 500 });
    expect(analytics.track.calls.allArgs()).toEqual([
      ['FORM_START', '/contribute'],
      ['SUBMISSION_ATTEMPT', '/contribute'],
    ]);
  });

  it('records workflow form stages only after accepted responses', () => {
    const response = new Subject<{ id: string }>();
    const demo = {
      session: { accountUsername: 'researcher' },
      createWorkflow: jasmine
        .createSpy('createWorkflow')
        .and.returnValue(response.asObservable()),
    };
    const form = new GuestWorkflowFormComponent(
      demo as any,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      {} as any,
      analytics as any,
    );
    form.status = { state: 'OPEN' } as any;
    form.title = 'Synthetic workflow';
    form.description =
      'A synthetic workflow description with enough characters for the form.';
    form.selectedIds.add('artifact-id');
    form.markTouched('comment');
    form.markTouched('comment');
    form.submissionComment = 'A synthetic workflow comment.';

    form.submit();
    expect(demo.createWorkflow).toHaveBeenCalledTimes(1);
    expect(analytics.track.calls.allArgs()).toEqual([
      ['FORM_START', '/create-workflow'],
      ['VALIDATION_ERROR', '/create-workflow'],
      ['SUBMISSION_ATTEMPT', '/create-workflow'],
    ]);

    response.next({ id: 'workflow-id' });
    expect(analytics.track.calls.mostRecent().args).toEqual([
      'WORKFLOW_SUBMITTED',
      '/create-workflow',
    ]);
  });

  it('does not count a rejected workflow request as submitted', () => {
    const response = new Subject<{ id: string }>();
    const form = new GuestWorkflowFormComponent(
      {
        session: { accountUsername: 'researcher' },
        createWorkflow: () => response.asObservable(),
      } as any,
      { snapshot: { paramMap: { get: () => null } } } as any,
      {} as any,
      {} as any,
      analytics as any,
    );
    form.status = { state: 'OPEN' } as any;
    form.title = 'Synthetic workflow';
    form.description =
      'A synthetic workflow description with enough characters for the form.';
    form.selectedIds.add('artifact-id');
    form.submissionComment = 'A synthetic workflow comment.';
    form.submit();
    response.error({ status: 500 });
    expect(analytics.track.calls.allArgs()).toEqual([
      ['FORM_START', '/create-workflow'],
      ['SUBMISSION_ATTEMPT', '/create-workflow'],
    ]);
  });
});
