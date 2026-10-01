import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ArtifactService } from '../artifacts/services/artifact.service';
import { WorkflowService } from '../services/workflow.service';
import { ShowcaseService } from '../showcase/showcase.service';
import { ShowcaseCatalog } from '../showcase/showcase.models';
import { DemoService } from './demo.service';
import { PublicCatalogService } from './public-catalog.service';

describe('PublicCatalogService', () => {
  let service: PublicCatalogService;
  let demo: jasmine.SpyObj<DemoService>;
  let showcase: jasmine.SpyObj<ShowcaseService>;
  let artifacts: jasmine.SpyObj<ArtifactService>;
  let workflows: jasmine.SpyObj<WorkflowService>;

  const curated: ShowcaseCatalog = {
    key: 'eeg-eye-state',
    organization: 'Neuroscience Gateway',
    summary: 'Published EEG recording',
    source: {
      title: 'EEG Eye State',
      doi: '10.24432/C57G7J',
      url: 'https://archive.ics.uci.edu/dataset/264/eeg+eye+state',
      creators: ['Oliver Roesler'],
      collected: '2013',
      licenseNote: 'CC BY 4.0',
    },
    ready: true,
    artifacts: [
      {
        id: 'artifact-1',
        title: 'EEG Eye State - original recording',
        description: 'Published recording',
        organizationSlug: 'neuroscience-gateway',
        submissionState: 'SUCCESS',
        submittedAt: '2026-09-29T00:00:00Z',
        updatedAt: null,
        blockchainTxId: 'tx-1',
        footprint: 'a'.repeat(64),
        manifest: [
          {
            filename: 'EEG Eye State.arff',
            hash: 'b'.repeat(64),
            algorithm: 'sha256',
            probe: null,
            angleDegrees: null,
          },
        ],
        keywords: ['eeg'],
        links: [],
        dois: ['10.24432/C57G7J'],
        submissionComment: 'Curated source',
      },
    ],
    workflows: [],
  };

  beforeEach(() => {
    demo = jasmine.createSpyObj('DemoService', [
      'listArtifacts',
      'listWorkflows',
      'getPublicArtifact',
      'getPublicWorkflow',
      'getPublicArtifactHistory',
      'getPublicWorkflowHistory',
    ]);
    showcase = jasmine.createSpyObj('ShowcaseService', [
      'examples',
      'exampleHistory',
    ]);
    artifacts = jasmine.createSpyObj('ArtifactService', ['getArtifactById']);
    workflows = jasmine.createSpyObj('WorkflowService', ['getWorkflow']);
    showcase.examples.and.returnValue(of({ examples: [curated] }));
    TestBed.configureTestingModule({
      providers: [
        PublicCatalogService,
        { provide: DemoService, useValue: demo },
        { provide: ShowcaseService, useValue: showcase },
        { provide: ArtifactService, useValue: artifacts },
        { provide: WorkflowService, useValue: workflows },
      ],
    });
    service = TestBed.inject(PublicCatalogService);
  });

  it('combines demo and curated artifacts without calling legacy catalog routes', () => {
    demo.listArtifacts.and.returnValue(of([{
      id: 'demo-1',
      title: 'Member artifact',
      description: 'Member-submitted record',
      keywords: ['member'],
      submittedAt: '2026-09-30T00:00:00Z',
      verified: false,
      submissionState: 'SUCCESS',
    } as any]));
    service.listArtifacts().subscribe((records) => {
      expect(records.map((record) => record.title)).toEqual([
        'Member artifact',
        'EEG Eye State - original recording',
      ]);
      expect(records[1].submissionState).toBe('SUCCESS');
    });
    expect(artifacts.getArtifactById).not.toHaveBeenCalled();
  });

  it('combines demo and curated workflows without calling legacy catalog routes', () => {
    demo.listWorkflows.and.returnValue(of([{
      id: 'demo-workflow',
      title: 'Member workflow',
      description: 'Member-submitted workflow',
      submittedAt: '2026-09-30T00:00:00Z',
      submissionState: 'SUCCESS',
    } as any]));
    showcase.examples.and.returnValue(of({ examples: [{
      ...curated,
      workflows: [{
        id: 'curated-workflow',
        title: 'EEG source provenance',
        description: 'Curated source grouping',
        organizationSlug: 'neuroscience-gateway',
        submissionState: 'SUCCESS',
        blockchainTxId: 'tx-2',
        artifactIds: ['artifact-1'],
        submittedAt: '2026-09-29T00:00:00Z',
        updatedAt: null,
      }],
    }] }));
    service.listWorkflows().subscribe((records) => {
      expect(records.map((record) => record.title)).toEqual([
        'Member workflow',
        'EEG source provenance',
      ]);
      expect(records[1].submittedAt).toEqual(new Date('2026-09-29T00:00:00Z'));
    });
    expect(workflows.getWorkflow).not.toHaveBeenCalled();
  });

  it('keeps demo records on the demo public read path', () => {
    const record = { id: 'demo-1', title: 'Demo' } as any;
    demo.getPublicArtifact.and.returnValue(of(record));
    service
      .artifact('demo-1')
      .subscribe((result) => expect(result).toBe(record));
    expect(showcase.examples).not.toHaveBeenCalled();
  });

  it('opens a curated public record when the demo route returns 404', () => {
    demo.getPublicArtifact.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    service.artifact('artifact-1').subscribe((result) => {
      expect(result.title).toBe('EEG Eye State - original recording');
      expect(result.organization).toBe('Neuroscience Gateway');
      expect(result.manifest?.[0].filename).toBe('EEG Eye State.arff');
    });
  });

  it('does not bypass a permission error through the curated route', () => {
    demo.getPublicArtifact.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    service.artifact('private-1').subscribe({
      next: () => fail('Expected a permission error'),
      error: (error: HttpErrorResponse) => expect(error.status).toBe(403),
    });
    expect(showcase.examples).not.toHaveBeenCalled();
    expect(artifacts.getArtifactById).not.toHaveBeenCalled();
  });

  it('loads curated public history after a demo 404', () => {
    demo.getPublicArtifactHistory.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    showcase.exampleHistory.and.returnValue(
      of({
        items: [
          {
            txId: 'tx-1',
            timestamp: '2026-09-29T00:00:00Z',
            snapshot: { footprint: 'a'.repeat(64) },
          },
        ],
        count: 1,
        hasMore: false,
      }),
    );
    service.history('artifact', 'artifact-1').subscribe((result) => {
      expect(result.items?.[0].txId).toBe('tx-1');
      expect(result.count).toBe(1);
    });
    expect(showcase.exampleHistory).toHaveBeenCalledWith(
      'eeg-eye-state',
      'artifacts',
      'artifact-1',
    );
  });
});
