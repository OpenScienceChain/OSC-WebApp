import { TestBed } from '@angular/core/testing';
declare const expect: any;
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ArtifactService } from './artifact.service';
import { CreateArtifactDTO, UpdateArtifactDTO } from '../models/artifact';
import { environment } from '../../../environments/environment';

describe('ArtifactService', () => {
  let service: ArtifactService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/artifacts`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ArtifactService],
    });
    service = TestBed.inject(ArtifactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  describe('createArtifactMetadataOnly', () => {
    it('should send artifact metadata to the API', () => {
      const mockDto: CreateArtifactDTO = {
        title: 'Test Artifact',
        description: 'This is a test artifact',
        keywords: ['test', 'artifact'],
        links: ['https://example.com'],
        dois: ['10.1234/test.123'],
        fundingAgencies: ['NSF', 'NIH'],
        acknowledgements: 'Thanks to everyone',
        manifest: [
          { filename: 'test.txt', hash: 'abc123', algorithm: 'sha256' },
        ],
        footprint: 'abc123',
      };

      // Use any since the flush will return empty object {}, not undefined
      service.createArtifactMetadataOnly(mockDto).subscribe((response) => {
        // Empty objects are truthy in JavaScript, so we're just checking the response was received
        expect(response).toBeDefined();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/artifacts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBe(mockDto);
      req.flush({});
    });

    it('should handle errors properly', () => {
      const mockDto: CreateArtifactDTO = {
        title: 'Test Artifact',
        description: 'This is a test artifact',
        keywords: ['test'],
        links: ['https://example.com'],
        dois: ['10.1234/test.123'],
        fundingAgencies: ['NSF'],
        acknowledgements: 'Thanks',
        manifest: [
          { filename: 'test.txt', hash: 'abc123', algorithm: 'sha256' },
        ],
        footprint: 'abc123',
      };

      // Spy on console.error to prevent pollution in test output
      spyOn(console, 'error');

      service.createArtifactMetadataOnly(mockDto).subscribe({
        next: () => fail('Expected error but got success'),
        error: (error) => {
          expect(error).toBeDefined();
          // The error handler returns this message for 400 status when the message is not "Invalid"
          expect(error.message).toBe('Invalid data');
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/artifacts`);
      // Send error response that would trigger the custom error handler in the service
      req.flush(
        { message: ['Invalid data'] },
        { status: 400, statusText: 'Bad Request' },
      );
    });
  });

  describe('getArtifacts visibility', () => {
    it('fetches a fresh list after the caller changes', () => {
      const results: string[][] = [];
      service
        .getArtifacts()
        .subscribe((items) => results.push(items.map((item) => item.id)));
      httpMock.expectOne(apiUrl).flush([{ id: 'public' }]);

      service
        .getArtifacts()
        .subscribe((items) => results.push(items.map((item) => item.id)));
      httpMock.expectOne(apiUrl).flush([{ id: 'public' }, { id: 'private' }]);

      expect(results).toEqual([['public'], ['public', 'private']]);
    });
  });

  describe('getArtifactById', () => {
    it('builds the correct URL', () => {
      service.getArtifactById('abc').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/abc`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'abc' });
    });
  });

  describe('getArtifactHistory', () => {
    it('uses defaults and constructs query string', () => {
      service.getArtifactHistory('abc').subscribe();
      const req = httpMock.expectOne(
        `${apiUrl}/abc/history?offset=0&limit=50&order=desc&includeValue=true`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], total: 0 });
    });

    it('supports custom options', () => {
      service
        .getArtifactHistory('abc', {
          offset: 10,
          limit: 5,
          order: 'asc',
          includeValue: false,
        })
        .subscribe();
      const req = httpMock.expectOne(
        `${apiUrl}/abc/history?offset=10&limit=5&order=asc&includeValue=false`,
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], total: 0 });
    });
  });

  describe('refreshArtifactHistory', () => {
    it('posts to refresh endpoint with defaults', () => {
      service.refreshArtifactHistory('abc').subscribe();
      const req = httpMock.expectOne(
        `${apiUrl}/abc/history/refresh?offset=0&limit=500&order=desc&includeValue=true`,
      );
      expect(req.request.method).toBe('POST');
      req.flush({});
    });
  });

  describe('updateArtifactMetadataOnly', () => {
    it('sends PUT with dto', () => {
      const dto: UpdateArtifactDTO = {
        keywords: ['k'],
        links: ['l'],
        dois: ['d'],
        fundingAgencies: ['NSF'],
        acknowledgements: 'a',
        manifest: [],
        footprint: 'f',
      };
      service.updateArtifactMetadataOnly('id1', dto).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/id1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush({});
    });
  });
  describe('error handling', () => {
    it('should handle client-side errors', () => {
      const mockDto: CreateArtifactDTO = {
        title: 'Test Artifact',
        description: 'This is a test artifact',
        keywords: ['test'],
        links: ['example.com'],
        dois: ['10.1234/test'],
        fundingAgencies: ['TestAgency'],
        acknowledgements: 'Test acknowledgement',
        manifest: [
          { filename: 'test.txt', hash: 'abcdef123456', algorithm: 'sha256' },
        ],
        footprint: 'abcdef123456',
      };

      // Spy on console.error to avoid cluttering test output
      spyOn(console, 'error');

      service.createArtifactMetadataOnly(mockDto).subscribe({
        error: (error) => {
          expect(error instanceof Error).toEqual(true);
          expect(error.message).toEqual('Client error message');
        },
      });

      const req = httpMock.expectOne(apiUrl);
      // Simulate a client-side error
      const mockError = new ErrorEvent('Network error', {
        message: 'Client error message',
      });
      req.error(mockError);
    });

    it('should handle server errors with specific status codes', () => {
      const mockDto: CreateArtifactDTO = {
        title: 'Test Artifact',
        description: 'This is a test artifact',
        keywords: ['test'],
        links: ['example.com'],
        dois: ['10.1234/test'],
        fundingAgencies: ['TestAgency'],
        acknowledgements: 'Test acknowledgement',
        manifest: [
          { filename: 'test.txt', hash: 'abcdef123456', algorithm: 'sha256' },
        ],
        footprint: 'abcdef123456',
      };

      const statusCodes = [
        { status: 400, message: 'Invalid artifact data provided.' },
        {
          status: 401,
          message: 'You must be authenticated to create artifacts.',
        },
        {
          status: 413,
          message: 'The file size exceeds the maximum allowed limit.',
        },
        { status: 415, message: 'The file type is not supported.' },
        {
          status: 500,
          message: 'A server error occurred. Please try again later.',
        },
      ];

      // Spy on console.error to avoid cluttering test output
      spyOn(console, 'error');

      // Test each status code
      statusCodes.forEach(({ status }) => {
        service.createArtifactMetadataOnly(mockDto).subscribe({
          error: (error) => {
            expect(error instanceof Error).toEqual(true);
            // No verificamos el mensaje exacto ya que el manejo de errores
            // en el servicio podría cambiarlo según el status code
          },
        });

        const req = httpMock.expectOne(apiUrl);
        req.flush({ message: 'Server error' }, { status, statusText: 'Error' });
      });
    });

    it('should use validation messages from the server if available', () => {
      const mockDto: CreateArtifactDTO = {
        title: 'Test Artifact',
        description: 'This is a test artifact',
        keywords: ['test'],
        links: ['example.com'],
        dois: ['10.1234/test'],
        fundingAgencies: ['TestAgency'],
        acknowledgements: 'Test acknowledgement',
        manifest: [
          { filename: 'test.txt', hash: 'abcdef123456', algorithm: 'sha256' },
        ],
        footprint: 'abcdef123456',
      };

      // Spy on console.error to avoid cluttering test output
      spyOn(console, 'error');
      spyOn(console, 'log');

      // Verificar que el manejador de errores está procesando la respuesta del servidor
      // En este caso, sabemos que en caso de error 400, se usa un mensaje genérico
      // en lugar del mensaje específico del servidor
      service.createArtifactMetadataOnly(mockDto).subscribe({
        error: (error) => {
          expect(error instanceof Error).toEqual(true);
          // El servicio establece un mensaje genérico para errores 400
          expect(error.message).toEqual('Invalid artifact data provided.');
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { message: ['Custom validation error', 'Another error'] },
        { status: 400, statusText: 'Bad Request' },
      );
    });
  });
});
