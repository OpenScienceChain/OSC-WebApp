import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { UpdateArtifactComponent } from './update-artifact.component';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ArtifactService } from '../services/artifact.service';
import { ToastrService } from 'ngx-toastr';
import * as CryptoJS from 'crypto-js';
import { ArtifactDetail } from '../../models/artifact-detail.model';

declare const expect: any;

describe('UpdateArtifactComponent', () => {
  let component: UpdateArtifactComponent;
  let fixture: ComponentFixture<UpdateArtifactComponent>;
  let artifactServiceSpy: jasmine.SpyObj<ArtifactService>;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  const mockArtifact: ArtifactDetail = {
    id: 'abc',
    title: 'T',
    description: 'D',
    keywords: ['k1'],
    links: ['https://a'],
    dois: ['10.1/x'],
    fundingAgencies: ['NSF'],
    acknowledgements: 'a',
    manifest: [
      { filename: 'b.txt', hash: 'bbb', algorithm: 'sha256' },
      { filename: 'a.txt', hash: 'aaa', algorithm: 'sha256' },
    ],
    footprint: 'original-foot',
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
  } as ArtifactDetail;

  beforeEach(async () => {
    artifactServiceSpy = jasmine.createSpyObj('ArtifactService', [
      'getArtifactById',
      'updateArtifactMetadataOnly',
    ]);
    toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    artifactServiceSpy.getArtifactById.and.returnValue(of(mockArtifact));
    artifactServiceSpy.updateArtifactMetadataOnly.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [UpdateArtifactComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: mockArtifact.id })),
          },
        },
        { provide: ArtifactService, useValue: artifactServiceSpy },
        { provide: ToastrService, useValue: toastrSpy },
        {
          provide: Router,
          useValue: { navigate: jasmine.createSpy('navigate') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateArtifactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onToggleKeepManifest clears selected files when toggled on', () => {
    component.selectedFilesData = [{ name: 'x', size: 1, hash: 'h' } as any];
    component.onToggleKeepManifest(true);
    expect(component.keepManifestUnchanged).toBeTrue();
    expect(component.selectedFilesData.length).toBe(0);
  });

  it('onSubmit shows error when invalid', fakeAsync(() => {
    component.keepManifestUnchanged = false;
    component.selectedFilesData = [];
    component.onSubmit();
    tick();
    expect(toastrSpy.error).toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
  }));

  it('onSubmit sends metadata-only update when keeping manifest', fakeAsync(() => {
    component.keepManifestUnchanged = true;
    component.artifact = mockArtifact;
    component.artifactForm.patchValue({
      keywords: 'changed',
      submission_comment: 'Valid update reason.',
    });
    spyOn<any>(component, 'hasMetadataChanges').and.returnValue(true);
    spyOn(component, 'isFormAndFileValid').and.returnValue(true);

    component.onSubmit();
    tick();

    expect(artifactServiceSpy.updateArtifactMetadataOnly).toHaveBeenCalled();
    const dto =
      artifactServiceSpy.updateArtifactMetadataOnly.calls.mostRecent().args[1];
    expect(dto.manifest.length).toBe(mockArtifact.manifest.length);
    expect(dto.footprint).toBe(mockArtifact.footprint);
    expect(component.lastCreatedId).toBe(mockArtifact.id);
  }));

  it('onSubmit rebuilds manifest and hashes canonical list when multiple files', fakeAsync(() => {
    component.keepManifestUnchanged = false;
    component.artifact = mockArtifact;
    component.artifactForm.patchValue({
      submission_comment: 'Valid update reason.',
    });
    component.selectedFilesData = [
      { name: 'b.txt', hash: '2', size: 10 } as any,
      { name: 'a.txt', hash: '1', size: 10 } as any,
    ];
    spyOn(component, 'isFormAndFileValid').and.returnValue(true);

    spyOn(CryptoJS, 'SHA256').and.returnValue({
      toString: () => 'hashed',
    } as any);

    component.onSubmit();
    tick();

    const dto =
      artifactServiceSpy.updateArtifactMetadataOnly.calls.mostRecent().args[1];
    expect(dto.manifest.length).toBe(2);
    expect(dto.footprint).toBe('hashed');
  }));

  describe('hasMetadataChanges', () => {
    const setMatchingFormValues = () => {
      component.artifactForm.patchValue({
        keywords: 'k1',
        links: 'https://a',
        doi: '10.1/x',
        nsf: true,
        nih: false,
        noaa: false,
        nasa: false,
        otherAgency: '',
        acknowledgment: 'a',
      });
    };

    it('returns false when metadata matches original', () => {
      component.artifact = mockArtifact;
      setMatchingFormValues();

      const result = (component as any).hasMetadataChanges();
      expect(result).toBeFalse();
    });

    it('returns true when metadata differs', () => {
      component.artifact = mockArtifact;
      setMatchingFormValues();
      component.artifactForm.patchValue({ keywords: 'k2' });

      const result = (component as any).hasMetadataChanges();
      expect(result).toBeTrue();
    });
  });

  describe('isFormAndFileValid', () => {
    const setValidForm = () => {
      component.artifact = mockArtifact;
      (component as any).prefillForm(mockArtifact);
      component.artifactForm.patchValue({
        keywords: 'k1',
        submission_comment: 'This is a valid update reason.',
        links: 'https://example.com',
        doi: '10.1234/abcd',
      });
      component.artifactForm.updateValueAndValidity();
    };

    it('returns false when processing', () => {
      setValidForm();
      (component as any).isProcessing = true;
      component.keepManifestUnchanged = false;
      component.selectedFilesData = [
        { name: 'a.txt', hash: 'h', size: 1 } as any,
      ];
      expect(component.isFormAndFileValid()).toBeFalse();
      (component as any).isProcessing = false;
    });

    it('returns false when keeping manifest and no metadata changes', () => {
      setValidForm();
      component.keepManifestUnchanged = true;
      spyOn<any>(component, 'hasMetadataChanges').and.returnValue(false);
      expect(component.isFormAndFileValid()).toBeFalse();
    });

    it('returns true when keeping manifest and metadata changes', () => {
      setValidForm();
      component.keepManifestUnchanged = true;
      spyOn<any>(component, 'hasMetadataChanges').and.returnValue(true);
      expect(component.isFormAndFileValid()).toBeTrue();
    });

    it('returns true when files selected and form valid', () => {
      setValidForm();
      component.keepManifestUnchanged = false;
      component.selectedFilesData = [
        { name: 'a.txt', hash: 'h', size: 1 } as any,
      ];
      expect(component.isFormAndFileValid()).toBeTrue();
    });

    it('returns false when no files selected', () => {
      setValidForm();
      component.keepManifestUnchanged = false;
      component.selectedFilesData = [];
      expect(component.isFormAndFileValid()).toBeFalse();
    });
  });
});
