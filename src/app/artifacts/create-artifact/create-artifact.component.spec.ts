import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { CreateArtifactComponent } from './create-artifact.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { ArtifactService } from '../services/artifact.service';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import {
  MAX_SINGLE_FILE_SIZE,
  MAX_FOLDER_SIZE,
  MAX_FILES_IN_FOLDER,
} from './create-artifact.component'; // or from the shared constants file

// Add Jasmine types
declare const jasmine: any;

// Create a custom mock File class that includes webkitRelativePath
class MockFileWithPath extends File {
  private _webkitRelativePath: string;

  constructor(
    parts: BlobPart[],
    filename: string,
    options: FilePropertyBag,
    relativePath: string,
  ) {
    super(parts, filename, options);
    this._webkitRelativePath = relativePath;
  }

  override get webkitRelativePath(): string {
    return this._webkitRelativePath;
  }
}

describe('CreateArtifactComponent', () => {
  let component: CreateArtifactComponent;
  let fixture: ComponentFixture<CreateArtifactComponent>;
  // Mock dependencies
  const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
  const locationSpy = jasmine.createSpyObj('Location', ['back']);
  const toastrSpy = jasmine.createSpyObj('ToastrService', [
    'success',
    'error',
    'info',
    'warning',
  ]);
  const artifactServiceSpy = jasmine.createSpyObj('ArtifactService', [
    'createArtifactMetadataOnly',
  ]);

  // Set up the artifact service mock to return a successful response
  artifactServiceSpy.createArtifactMetadataOnly.and.returnValue(of({}));

  // Helper function to create mock FileList
  function createMockFileList(files: File[]): FileList {
    const fileList: Partial<FileList> = {
      length: files.length,
      item: (index: number) => (index < files.length ? files[index] : null),
    };

    // Add array-like indexed access
    files.forEach((file, index) => {
      fileList[index] = file;
    });

    return fileList as FileList;
  }

  // Helper function to create a mock file with path
  function createMockFileWithPath(
    content: string | ArrayBuffer,
    filename: string,
    relativePath: string,
  ): File {
    return new MockFileWithPath(
      [content],
      filename,
      {
        type: filename.endsWith('.txt')
          ? 'text/plain'
          : 'application/octet-stream',
      },
      relativePath,
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CommonModule, CreateArtifactComponent],
      providers: [
        FormBuilder,
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        { provide: ToastrService, useValue: toastrSpy },
        { provide: ArtifactService, useValue: artifactServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateArtifactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Reset spies before each test to prevent state leakage,
    // and ALWAYS restore the stubbed success response.
    artifactServiceSpy.createArtifactMetadataOnly.calls.reset();
    artifactServiceSpy.createArtifactMetadataOnly.and.returnValue(of({}));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Form Validation Tests
  describe('Form Validation', () => {
    it('should initialize with invalid form', () => {
      expect(component.artifactForm.valid).toBeFalsy();
    });

    it('should validate required fields', () => {
      const form = component.artifactForm;
      expect(form.get('title')?.errors?.['required']).toBeTruthy();
      expect(form.get('description')?.errors?.['required']).toBeTruthy();
    });

    it('should validate title length', () => {
      const titleControl = component.artifactForm.get('title');
      titleControl?.setValue('ab');
      expect(titleControl?.errors?.['minlength']).toBeTruthy();

      titleControl?.setValue('a'.repeat(201));
      expect(titleControl?.errors?.['maxlength']).toBeTruthy();

      titleControl?.setValue('Valid Title');
      expect(titleControl?.errors).toBeNull();
    });

    it('should validate description length', () => {
      const descControl = component.artifactForm.get('description');
      descControl?.setValue('a'.repeat(49));
      expect(descControl?.errors?.['minlength']).toBeTruthy();

      descControl?.setValue('a'.repeat(3001));
      expect(descControl?.errors?.['maxlength']).toBeTruthy();

      descControl?.setValue('a'.repeat(100));
      expect(descControl?.errors).toBeNull();
    });

    it('should validate comma-separated values', () => {
      const keywordsControl = component.artifactForm.get('keywords');
      keywordsControl?.setValue('keyword1,,keyword2');
      expect(keywordsControl?.errors?.['invalidFormat']).toBeTruthy();

      keywordsControl?.setValue('keyword1,keyword2');
      expect(keywordsControl?.errors).toBeNull();
    });

    it('should validate empty values for comma-separated fields', () => {
      const keywordsControl = component.artifactForm.get('keywords');
      keywordsControl?.setValue('');
      expect(keywordsControl?.errors?.['required']).toBeTruthy();

      const otherAgencyControl = component.artifactForm.get('otherAgency');
      otherAgencyControl?.setValue('');
      expect(otherAgencyControl?.errors).toBeNull();
    });

    it('should validate URLs', () => {
      const linksControl = component.artifactForm.get('links');
      linksControl?.setValue('domain1,,domain2');
      expect(linksControl?.errors?.['invalidLinks']).toBeTruthy();

      linksControl?.setValue('domain1.com,domain2.com');
      expect(linksControl?.errors).toBeNull();
    });

    it('should validate DOIs', () => {
      const doiControl = component.artifactForm.get('doi');
      doiControl?.setValue('invalid-doi');
      expect(doiControl?.errors?.['invalidDoi']).toBeTruthy();

      doiControl?.setValue('10.1234/valid.doi');
      expect(doiControl?.errors).toBeNull();
    });

    it('should validate multiple DOIs', () => {
      const doiControl = component.artifactForm.get('doi');
      doiControl?.setValue('10.1234/valid.doi,invalid-doi');
      expect(doiControl?.errors?.['invalidDoi']).toBeTruthy();

      doiControl?.setValue('10.1234/valid.doi,10.5678/another.valid.doi');
      expect(doiControl?.errors).toBeNull();
    });

    it('should validate acknowledgment length', () => {
      const ackControl = component.artifactForm.get('acknowledgment');
      ackControl?.setValue('a'.repeat(3001));
      expect(ackControl?.errors?.['maxlength']).toBeTruthy();

      ackControl?.setValue('a'.repeat(3000));
      expect(ackControl?.errors).toBeNull();
    });

    it('should validate submission comment length', () => {
      const commentControl = component.artifactForm.get('submission_comment');
      commentControl?.setValue('short comment');
      expect(commentControl?.errors?.['minlength']).toBeTruthy();

      commentControl?.setValue('a'.repeat(1001));
      expect(commentControl?.errors?.['maxlength']).toBeTruthy();

      commentControl?.setValue('a'.repeat(20));
      expect(commentControl?.errors).toBeNull();
    });
  });

  // File Handling Tests
  describe('File Handling', () => {
    it('should handle drag over event', () => {
      const mockEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
      });

      spyOn(mockEvent, 'preventDefault');
      spyOn(mockEvent, 'stopPropagation');

      component.onDragOver(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isDragging).toBe(true);
    });

    it('should handle drag leave event', () => {
      const mockEvent = new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
      });

      spyOn(mockEvent, 'preventDefault');
      spyOn(mockEvent, 'stopPropagation');

      component.onDragLeave(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.isDragging).toBe(false);
    });

    it('should handle single file selection', fakeAsync(() => {
      // Create a small file that's within size limits
      const fileContent = 'test content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

      // Mock the calculateFileHash method to return a predictable hash
      spyOn(component as any, 'calculateFileHash').and.returnValue(
        Promise.resolve('mockedHash'),
      );

      component.handleSingleFileSelection(file);
      tick(); // Wait for async operations to complete

      expect(component.selectedFilesData.length).toBe(1);
      const fileData = component.selectedFilesData[0];
      expect(fileData.name).toBe('test.txt');
      expect(fileData.hash).toBe('mockedHash');
      expect(component.isProcessing).toBe(false);
      expect(component.uploadError).toBe(false);
    }));

    it('should reject empty files', fakeAsync(() => {
      const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });

      component.handleSingleFileSelection(emptyFile);
      tick();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain('The selected file is empty');
    }));

    it('should reject oversized single files', fakeAsync(() => {
      // real 20 MB + 1 byte payload
      const bigPayload = new Uint8Array(MAX_SINGLE_FILE_SIZE + 1);
      const largeFile = new File([bigPayload], 'large.bin');

      component.handleSingleFileSelection(largeFile);
      tick();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain('exceeds the limit');
    }));

    it('should handle file drop event', fakeAsync(() => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
      });

      // Mock the dataTransfer after event creation
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [file],
          items: [
            {
              webkitGetAsEntry: () => ({ isDirectory: false }),
            },
          ],
        },
      });

      spyOn(component as any, 'handleSingleFileSelection').and.returnValue(
        Promise.resolve(),
      );

      component.onDrop(dropEvent);
      tick();

      expect(component.isDragging).toBe(false);
      expect(component['handleSingleFileSelection']).toHaveBeenCalledWith(file);
    }));

    it('should reject folder drop and show error message', fakeAsync(() => {
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
      });

      // Mock the dataTransfer after event creation
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          items: [
            {
              webkitGetAsEntry: () => ({ isDirectory: true }),
            },
          ],
        },
      });

      component.onDrop(dropEvent);
      tick();

      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain(
        'Please use the "Select a Folder" button',
      );
    }));

    it('should handle file selection through input element', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const mockEvent = {
        target: {
          files: [file],
        },
      } as unknown as Event;

      spyOn(component as any, 'handleSingleFileSelection').and.returnValue(
        Promise.resolve(),
      );

      await component.handleFileSelection(mockEvent);

      expect(component['handleSingleFileSelection']).toHaveBeenCalledWith(file);
    });

    it('should handle folder selection through input element', async () => {
      const files = [
        new File(['file1 content'], 'folder/file1.txt', { type: 'text/plain' }),
        new File(['file2 content'], 'folder/file2.txt', { type: 'text/plain' }),
      ];

      const mockEvent = {
        target: {
          files: createMockFileList(files),
        },
      } as unknown as Event;

      spyOn(component as any, 'handleFolderSelection').and.returnValue(
        Promise.resolve(),
      );

      await component.handleFileSelection(mockEvent);

      expect(component['handleFolderSelection']).toHaveBeenCalled();
    });

    it('should do nothing for empty file selection', async () => {
      const mockEvent = {
        target: {
          files: null,
        },
      } as unknown as Event;

      spyOn(component as any, 'handleSingleFileSelection');
      spyOn(component as any, 'handleFolderSelection');

      await component.handleFileSelection(mockEvent);

      expect(component['handleSingleFileSelection']).not.toHaveBeenCalled();
      expect(component['handleFolderSelection']).not.toHaveBeenCalled();
    });

    it('should handle error when calculating file hash', fakeAsync(() => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      spyOn(component as any, 'calculateFileHash').and.returnValue(
        Promise.reject(new Error('Hash error')),
      );

      component.handleSingleFileSelection(file);
      tick();

      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain('Error processing file');
      expect(component.isProcessing).toBe(false);
    }));

    it('should reject empty folders', fakeAsync(() => {
      const emptyFileList = createMockFileList([]);

      component.handleFolderSelection(emptyFileList);
      tick();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain('The selected folder is empty');
    }));

    it('should reject folders with too many files', fakeAsync(() => {
      const manyFiles = Array.from(
        { length: MAX_FILES_IN_FOLDER + 1 },
        (_, i) => new File([`c${i}`], `f${i}.txt`),
      );
      const fileList = createMockFileList(manyFiles);

      component.handleFolderSelection(fileList);
      tick();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain('too many files');
    }));

    it('should reject oversized folders', fakeAsync(() => {
      const big15 = new Uint8Array(MAX_FOLDER_SIZE); // 15 MB
      const file1 = new File([big15], 'file1.bin');
      const file2 = new File([big15], 'file2.bin');

      const fileList = createMockFileList([file1, file2]);

      component.handleFolderSelection(fileList);
      tick();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain('exceeds the limit');
    }));

    it('should reject folders with only empty files', fakeAsync(() => {
      const folderWithEmptyFiles = createMockFileList([
        new File([], 'empty1.txt'),
        new File([], 'empty2.txt'),
      ]);

      component.handleFolderSelection(folderWithEmptyFiles);
      tick();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(true);
      expect(component.errorMessage).toContain(
        'All files in the selected folder are empty',
      );
    }));

    it('should handle folder selection correctly', fakeAsync(() => {
      const files = [
        createMockFileWithPath('content1', 'file1.txt', 'folder/file1.txt'),
        createMockFileWithPath('content2', 'file2.txt', 'folder/file2.txt'),
      ];
      const fileList = createMockFileList(files);

      // one generic spy for every file
      spyOn(component as any, 'calculateFileHash').and.returnValue(
        Promise.resolve('mockHash'),
      );

      component.handleFolderSelection(fileList);
      tick();

      expect(component.selectedFilesData.length).toBe(2);
      expect(component.selectedFilesData[0].name).toBe('folder/file1.txt');
      expect(component.selectedFilesData[0].hash).toBe('mockHash');
      expect(component.selectedFilesData[1].name).toBe('folder/file2.txt');
      expect(component.selectedFilesData[1].hash).toBe('mockHash');
      expect(component.uploadError).toBe(false);
      expect(component.isProcessing).toBe(false);
    }));

    it('should skip empty files within a folder', fakeAsync(() => {
      const files = [
        createMockFileWithPath('content1', 'file1.txt', 'folder/file1.txt'),
        new File([], 'empty.txt', { type: 'text/plain' }),
      ];
      const fileList = createMockFileList(files);

      spyOn(component as any, 'calculateFileHash').and.returnValue(
        Promise.resolve('hash1'),
      );

      component.handleFolderSelection(fileList);
      tick();

      expect(component.selectedFilesData.length).toBe(1);
      expect(component.selectedFilesData[0].name).toBe('folder/file1.txt');
    }));
  });

  // UI Interaction and State Management Tests
  describe('UI Interaction and State', () => {
    it('should reset upload state', () => {
      component.selectedFilesData = [
        { content: new File([], 'test'), name: 'test', hash: '123', size: 1 },
      ];
      component.uploadError = true;
      component.errorMessage = 'error';

      component.resetUpload();

      expect(component.selectedFilesData.length).toBe(0);
      expect(component.uploadError).toBe(false);
      expect(component.errorMessage).toBe('');
    });

    it('should reset the form and upload state', () => {
      // Set some form values and upload state
      component.artifactForm.patchValue({ title: 'test', nsf: true });
      component.selectedFilesData = [
        { content: new File([], 'test'), name: 'test', hash: '123', size: 1 },
      ];
      component.isSubmitted = true;

      component.resetForm();

      expect(component.artifactForm.get('title')?.value).toBeNull();
      expect(component.artifactForm.get('nsf')?.value).toBe(false);
      expect(component.selectedFilesData.length).toBe(0);
      expect(component.isSubmitted).toBe(false);
    });

    it('should show error when form is submitted with invalid data', () => {
      component.onSubmit();

      // Since the form is initially invalid, it should not proceed
      expect(
        artifactServiceSpy.createArtifactMetadataOnly,
      ).not.toHaveBeenCalled();
    });

    it('should show error when form is submitted without a file', () => {
      component.artifactForm.patchValue({
        title: 'Valid Title',
        description: 'a'.repeat(50),
        submission_comment: 'This is a valid submission comment.',
        keywords: 'kw1',
      });

      component.onSubmit();

      expect(
        artifactServiceSpy.createArtifactMetadataOnly,
      ).not.toHaveBeenCalled();
    });

    it('should submit the form successfully', fakeAsync(() => {
      // Mock valid form and file state
      component.artifactForm.patchValue({
        title: 'Valid Title',
        description: 'a'.repeat(50),
        submission_comment: 'This is a valid submission comment.',
        keywords: 'kw1, kw2',
        links: 'http://link1.com',
        doi: '10.1234/doi1',
        nsf: true,
        otherAgency: 'other',
        acknowledgment: 'thanks',
      });

      component.selectedFilesData = [
        {
          content: new File(['content'], 'test.txt'),
          name: 'test.txt',
          hash: 'hash123',
          size: 7,
        },
      ];

      const resetFormSpy = spyOn(component, 'resetForm');

      component.onSubmit();

      tick(); // Allow async operations like subscribe() to complete

      expect(artifactServiceSpy.createArtifactMetadataOnly).toHaveBeenCalled();
      const submittedDto =
        artifactServiceSpy.createArtifactMetadataOnly.calls.mostRecent()
          .args[0];

      expect(submittedDto.title).toBe('Valid Title');
      expect(submittedDto.keywords).toEqual(['kw1', 'kw2']);
      expect(submittedDto.links).toEqual(['http://link1.com']);
      expect(submittedDto.fundingAgencies).toEqual(['NSF', 'other']);
      expect(submittedDto.manifest.length).toBe(1);
      expect(submittedDto.manifest[0].filename).toBe('test.txt');
      expect(submittedDto.manifest[0].hash).toBe('hash123');

      expect(toastrSpy.success).toHaveBeenCalled();
      expect(resetFormSpy).toHaveBeenCalled();
    }));

    it('should handle submission error', fakeAsync(() => {
      // Mock a failed submission
      const errorResponse = new Error('Server error');
      artifactServiceSpy.createArtifactMetadataOnly.and.returnValue(
        throwError(() => errorResponse),
      );

      // Set valid form and file state
      component.artifactForm.patchValue({
        title: 'Valid Title',
        description: 'a'.repeat(50),
        submission_comment: 'This is a valid submission comment.',
        keywords: 'kw1',
      });
      component.selectedFilesData = [
        {
          content: new File(['content'], 'test.txt'),
          name: 'test.txt',
          hash: 'hash123',
          size: 7,
        },
      ];

      const showErrorSpy = spyOn(component as any, 'showError');

      component.onSubmit();

      tick(); // Allow async operations to complete

      expect(showErrorSpy).toHaveBeenCalledWith(
        'Error creating artifact: Server error',
      );
      expect(component.isProcessing).toBe(false);
    }));
  });

  // Helper Function Tests
  describe('Helper Functions', () => {
    it('should format file size correctly', () => {
      expect(component.formatFileSize(0)).toBe('0 Bytes');
      expect(component.formatFileSize(1024)).toBe('1.00 KB');
      expect(component.formatFileSize(1024 * 1024)).toBe('1.00 MB');
    });

    it('should process comma-separated fields correctly', () => {
      const process = (component as any).processCommaSeparatedField;
      expect(process('  item1, item2  ,item3 ')).toEqual([
        'item1',
        'item2',
        'item3',
      ]);
      expect(process('')).toEqual(['']);
      expect(process(null)).toEqual(['']);
      expect(process(' ')).toEqual(['']);
    });

    it('should handle links field specifically', () => {
      const process = (component as any).processCommaSeparatedField;
      expect(process('', 'links')).toEqual([]);
      expect(process(' , ', 'links')).toEqual([]);
      expect(process('http://link.com', 'links')).toEqual(['http://link.com']);
    });

    it('should process funding agencies correctly', () => {
      // Access the private method correctly to preserve 'this' context
      const process = (formValues: any) =>
        (component as any).processFundingAgencies(formValues);

      let values = {
        nsf: true,
        nih: false,
        noaa: true,
        nasa: false,
        otherAgency: '  agency1, agency2',
      };
      expect(process(values)).toEqual(['NSF', 'NOAA', 'agency1', 'agency2']);

      values = {
        nsf: false,
        nih: false,
        noaa: false,
        nasa: false,
        otherAgency: '',
      };
      expect(process(values)).toEqual(['']);

      values = {
        nsf: true,
        nih: true,
        noaa: true,
        nasa: true,
        otherAgency: '',
      };
      expect(process(values)).toEqual(['NSF', 'NIH', 'NOAA', 'NASA']);
    });
  });

  // Test isFormAndFileValid
  describe('isFormAndFileValid', () => {
    it('should return false if form is invalid', () => {
      component.artifactForm.get('title')?.setValue(''); // Make form invalid
      component.selectedFilesData = [
        { content: new File([], 'test'), name: 'test', hash: '123', size: 1 },
      ];
      expect(component.isFormAndFileValid()).toBeFalse();
    });

    it('should return false if no file is selected', () => {
      component.artifactForm.get('title')?.setValue('Valid Title');
      component.artifactForm.get('description')?.setValue('a'.repeat(50));
      component.selectedFilesData = []; // No file
      expect(component.isFormAndFileValid()).toBeFalse();
    });

    it('should return false if processing is in progress', () => {
      component.artifactForm.get('title')?.setValue('Valid Title');
      component.artifactForm.get('description')?.setValue('a'.repeat(50));
      component.selectedFilesData = [
        { content: new File([], 'test'), name: 'test', hash: '123', size: 1 },
      ];
      (component as any).isProcessing = true;
      expect(component.isFormAndFileValid()).toBeFalse();
    });

    it('should return true if form is valid and file is selected', () => {
      component.artifactForm.get('title')?.setValue('Valid Title');
      component.artifactForm.get('description')?.setValue('a'.repeat(50));
      component.artifactForm
        .get('submission_comment')
        ?.setValue('This is a valid submission comment.');
      component.artifactForm.get('keywords')?.setValue('kw1');
      component.selectedFilesData = [
        { content: new File([], 'test'), name: 'test', hash: '123', size: 1 },
      ];
      expect(component.isFormAndFileValid()).toBeTrue();
    });
  });

  // Test formatFileName
  describe('formatFileName', () => {
    it('should return the full name if no slash is present', () => {
      expect(component.formatFileName('test.txt')).toBe('test.txt');
    });

    it('should return only the filename when a path is present', () => {
      expect(component.formatFileName('folder/test.txt')).toBe('test.txt');
      expect(component.formatFileName('folder/subfolder/file.bin')).toBe(
        'file.bin',
      );
    });

    it('should handle empty or null strings', () => {
      expect(component.formatFileName('')).toBe('');
      expect(component.formatFileName(null as any)).toBe('');
    });
  });
});
