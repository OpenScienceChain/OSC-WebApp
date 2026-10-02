import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DemoArtifact, DemoSession, DemoStatus } from './demo.models';
import { DemoComponent } from './demo.component';
import { DemoService } from './demo.service';

describe('DemoComponent', () => {
  let fixture: ComponentFixture<DemoComponent>;
  let component: DemoComponent;
  let demo: jasmine.SpyObj<DemoService> & { session: DemoSession | null };

  const openStatus: DemoStatus = {
    state: 'OPEN',
    message: 'The interactive demonstration is open.',
    opensAt: '2026-10-20T15:00:00.000Z',
    closesAt: '2026-10-23T15:00:00.000Z',
    interactionsAllowed: true,
  };
  const session: DemoSession = {
    csrfToken: 'csrf-token',
    contributorAlias: 'guest-1234abcd',
    organization: 'neuroscience-gateway',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };

  beforeEach(async () => {
    demo = jasmine.createSpyObj<DemoService>('DemoService', [
      'getStatus',
      'getCounters',
      'listArtifacts',
      'listWorkflows',
      'createSession',
      'refreshSession',
      'createArtifact',
      'getArtifact',
      'getArtifactHistory',
      'createWorkflow',
      'getWorkflow',
      'getWorkflowHistory',
      'clearSession',
    ]) as jasmine.SpyObj<DemoService> & { session: DemoSession | null };
    demo.session = null;
    demo.getStatus.and.returnValue(of(openStatus));
    demo.getCounters.and.returnValue(
      of({
        anonymousBrowserSessions: 2,
        acceptedArtifacts: 1,
        confirmedArtifacts: 1,
        acceptedWorkflows: 0,
        confirmedWorkflows: 0,
        provenanceHistoryViews: 1,
      }),
    );
    demo.listArtifacts.and.returnValue(of([]));
    demo.listWorkflows.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DemoComponent],
      providers: [{ provide: DemoService, useValue: demo }],
    }).compileComponents();
    fixture = TestBed.createComponent(DemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('starts a guest session bound to the selected organization', () => {
    demo.createSession.and.returnValue(of(session));
    const choices = Array.from(
      fixture.nativeElement.querySelectorAll('.organization-card'),
    ) as HTMLButtonElement[];
    choices[0].click();
    fixture.detectChanges();
    const start = fixture.nativeElement.querySelector(
      '[data-cy="start-demo-session"]',
    ) as HTMLButtonElement;
    expect(start.disabled).toBeFalse();
    start.click();
    fixture.detectChanges();

    expect(demo.createSession).toHaveBeenCalledOnceWith('neuroscience-gateway');
    expect(fixture.nativeElement.textContent).toContain('guest-1234abcd');
    expect(fixture.nativeElement.textContent).toContain('Neuroscience Gateway');
  });

  it('hashes locally and submits no original filename or file bytes', async () => {
    component.session = session;
    component.status = openStatus;
    fixture.detectChanges();
    const artifact: DemoArtifact = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Demo artifact guest-1234abcd 11111111',
      organization: 'Neuroscience Gateway',
      contributorAlias: 'guest-1234abcd',
      fingerprint: 'a'.repeat(64),
      manifestName: 'demo-artifact-11111111.txt',
      verified: false,
      submissionState: 'SUCCESS',
      blockchainTxId: 'ledger-transaction',
      submittedAt: new Date().toISOString(),
    };
    demo.createArtifact.and.returnValue(of(artifact));
    demo.getArtifact.and.returnValue(of(artifact));

    const file = new File(['abc'], 'private-original-name.txt', {
      type: 'text/plain',
    });
    await component.onFileSelected({
      target: { files: [file], value: '' },
    } as unknown as Event);
    fixture.detectChanges();

    expect(component.artifactHash).toMatch(/^[a-f0-9]{64}$/);
    expect(component.artifactSize).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain(
      'private-original-name.txt',
    );

    component.submitArtifact();
    const request = demo.createArtifact.calls.mostRecent().args[0];
    expect(Object.keys(request).sort()).toEqual(
      [
        'extension',
        'fingerprint',
        'requestId',
        'researchContext',
        'sizeBytes',
      ].sort(),
    );
    expect(JSON.stringify(request)).not.toContain('private-original-name');
    expect(Object.values(request)).not.toContain('abc');
    expect(request.fingerprint).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('keeps public browsing available in read-only mode', () => {
    component.session = null;
    component.status = {
      ...openStatus,
      state: 'READ_ONLY',
      interactionsAllowed: false,
      message: 'New contributions are paused.',
    };
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-cy="start-demo-session"]'),
    ).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      'Browse both demonstration spaces',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'New writes are paused',
    );
  });

  it('does not show a session-gated survey', () => {
    component.session = session;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(
      'Three-question survey',
    );
  });
});
