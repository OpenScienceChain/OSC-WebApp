import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { WorkflowService } from './workflow.service';
import { WorkflowListItem, Workflow } from '../models/workflow.model';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WorkflowService],
    });
    service = TestBed.inject(WorkflowService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getWorkflows', () => {
    it('should return an observable of workflow list items', (done) => {
      const mockData: WorkflowListItem[] = [
        {
          id: '1',
          title: 'Test Workflow',
          description: 'A test workflow description',
          keywords: ['test'],
          submissionState: 'PENDING',
          submittedAt: new Date(),
          updatedAt: null as any,
        },
      ];

      service.getWorkflows().subscribe((workflows) => {
        expect(workflows).toBeTruthy();
        expect(workflows.length).toBe(1);
        expect(workflows[0].title).toBe('Test Workflow');
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/workflows'));
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });
  });

  describe('getWorkflow', () => {
    it('should return a single workflow by id', (done) => {
      const mockWorkflow: Partial<Workflow> = {
        id: '1',
        title: 'Test Workflow',
        description: 'A test workflow description',
        keywords: ['test'],
        githubRepositories: [],
        artifacts: [],
        submissionState: 'PENDING',
        submitterEmail: 'test@example.com',
        submitterUsername: 'testuser',
        submission_comment: 'Test comment',
      };

      service.getWorkflow('1').subscribe((workflow) => {
        expect(workflow).toBeTruthy();
        expect(workflow.id).toBe('1');
        expect(workflow.title).toBe('Test Workflow');
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/workflows/1'));
      expect(req.request.method).toBe('GET');
      req.flush(mockWorkflow);
    });
  });

  describe('createWorkflow', () => {
    it('should POST a new workflow', (done) => {
      const dto = {
        title: 'New Workflow',
        description: 'Description long enough for validation',
        keywords: ['k1'],
        githubRepositories: [],
        artifactIds: [],
        submission_comment: 'A long enough submission comment.',
      };

      service.createWorkflow(dto).subscribe((res) => {
        expect(res.id).toBe('new-id');
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/workflows'));
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'new-id' });
    });
  });

  describe('updateWorkflow', () => {
    it('should PUT an updated workflow', (done) => {
      const dto = {
        keywords: ['updated'],
        submission_comment: 'Updated comment long enough.',
      };

      service.updateWorkflow('1', dto).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/workflows/1'));
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });
  });
});
