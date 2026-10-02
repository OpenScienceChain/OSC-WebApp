import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { DetailArtifactComponent } from './detail-artifact.component';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ArtifactService } from '../services/artifact.service';
import { ArtifactDetail } from '../../models/artifact-detail.model';

declare const jasmine: any;

describe('DetailArtifactComponent', () => {
  let component: DetailArtifactComponent;
  let fixture: ComponentFixture<DetailArtifactComponent>;

  const mockArtifact: ArtifactDetail = {
    id: '123',
    title: 'Test Artifact',
    description: 'Test description',
    keywords: ['test'],
    links: [],
    dois: [],
    fundingAgencies: [],
    acknowledgements: '',
    manifest: [
      {
        filename: 'sample.txt',
        hash: 'abcdef',
        algorithm: 'sha256',
      },
    ],
    submittedAt: '',
    verified: false,
    lastTimeVerified: null,
    submissionState: 'PENDING',
    submitterEmail: 'test@example.com',
    submitterUsername: 'tester',
    blockchainTxId: null,
    peerId: null,
    submissionError: null,
    organization: { name: 'TestOrg' },
  } as any;

  const artifactServiceStub = {
    getArtifactById: () => of(mockArtifact),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailArtifactComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(new Map([['id', '123']])) },
        },
        { provide: ArtifactService, useValue: artifactServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailArtifactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('leaves the loading state when the detail request fails', () => {
    spyOn(artifactServiceStub, 'getArtifactById').and.returnValue(
      throwError(() => new Error('unavailable')),
    );

    component.loadArtifact();

    expect(component.isLoading).toBeFalse();
    expect(component.errorMessage).toContain('could not load');
  });

  describe('utility methods', () => {
    it('does not duplicate the artifact prefix in a display ID', () => {
      component.artifact = { ...mockArtifact, id: 'artifact-nsg-001' };
      expect(component.recordId()).toBe('osc-is-artifact-nsg-001');
    });

    it('truncated should return em dash for null value', () => {
      expect(component.truncated(null)).toBe('\u2014');
    });

    it('truncated should shorten long strings with ellipsis', () => {
      expect(component.truncated('abcdefghijkl', 6)).toBe('abcdef\u2026');
    });

    it('printManifest should open new window and write manifest', fakeAsync(() => {
      component.artifact = mockArtifact;
      const mockWin = {
        document: {
          createElement: () => ({ textContent: '' }),
          body: { appendChild: jasmine.createSpy('appendChild') },
          title: '',
          open: jasmine.createSpy('open'),
          write: jasmine.createSpy('write'),
          close: jasmine.createSpy('close'),
        },
        focus: jasmine.createSpy('focus'),
      } as unknown as Window;

      spyOn(window, 'open').and.returnValue(mockWin);

      component.printManifest();
      tick(20);

      expect(window.open).toHaveBeenCalled();
      expect(mockWin.document.open).toHaveBeenCalled();
      expect(mockWin.document.write).toHaveBeenCalled();
      expect(mockWin.document.close).toHaveBeenCalled();
      expect(mockWin.focus).toHaveBeenCalled();
    }));

    it('printManifest should use DOM APIs when head/body present', fakeAsync(() => {
      component.artifact = mockArtifact;
      const headAppend = jasmine.createSpy('head.appendChild');
      const bodyAppend = jasmine.createSpy('body.appendChild');
      const mockWin = {
        document: {
          createElement: (tag: string) => ({ tagName: tag, textContent: '' }),
          head: { appendChild: headAppend },
          body: { innerHTML: '', appendChild: bodyAppend },
          open: jasmine.createSpy('open'),
          write: jasmine.createSpy('write'),
          close: jasmine.createSpy('close'),
        },
        focus: jasmine.createSpy('focus'),
        print: jasmine.createSpy('print'),
      } as unknown as Window;

      spyOn(window, 'open').and.returnValue(mockWin);

      component.printManifest();
      tick(20);

      expect(window.open).toHaveBeenCalled();
      expect(headAppend).toHaveBeenCalled();
      expect(bodyAppend).toHaveBeenCalled();
      expect(mockWin.document.write).not.toHaveBeenCalled();
    }));
    it('printManifest should alert when popup blocked', () => {
      component.artifact = mockArtifact;
      spyOn(window, 'open').and.returnValue(null as any);
      spyOn(window, 'alert');
      component.printManifest();
      expect(window.alert).toHaveBeenCalled();
    });

    it('onUpdateArtifact navigates to update route', () => {
      const navigate = jasmine.createSpy('navigate');
      (component as any).router = { navigate };
      component.artifact = mockArtifact;
      component.onUpdateArtifact();
      expect(navigate).toHaveBeenCalled();
    });
  });
});
