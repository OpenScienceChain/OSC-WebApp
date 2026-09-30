import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CreateArtifactDTO, UpdateArtifactDTO } from '../models/artifact';
import { getApiBaseUrl } from '../../services/api-base-url';
import { Artifact } from '../../models/artifact.model';
import { ArtifactDetail } from '../../models/artifact-detail.model';
import { ArtifactHistoryResponse } from '../../models/artifact-history.model';

@Injectable({
  providedIn: 'root',
})
export class ArtifactService {
  private get apiUrl(): string {
    return `${getApiBaseUrl()}/artifacts`;
  }

  constructor(private readonly http: HttpClient) {}

  /**
   * Gets the catalog for the current caller. Visibility can change with auth.
   */
  getArtifacts(): Observable<Artifact[]> {
    return this.http
      .get<Artifact[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gets a single artifact by its ID
   */
  getArtifactById(id: string): Observable<ArtifactDetail> {
    return this.http
      .get<ArtifactDetail>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gets blockchain-backed history for an artifact
   */
  getArtifactHistory(
    id: string,
    options?: {
      offset?: number;
      limit?: number;
      order?: 'asc' | 'desc';
      includeValue?: boolean;
    },
  ): Observable<ArtifactHistoryResponse> {
    const {
      offset = 0,
      limit = 50,
      order = 'desc',
      includeValue = true,
    } = options ?? {};
    const url = `${this.apiUrl}/${id}/history?offset=${offset}&limit=${limit}&order=${order}&includeValue=${includeValue}`;
    return this.http
      .get<ArtifactHistoryResponse>(url)
      .pipe(catchError(this.handleError));
  }

  /**
   * Triggers a backend refresh of artifact history
   */
  refreshArtifactHistory(
    id: string,
    options?: {
      offset?: number;
      limit?: number;
      order?: 'asc' | 'desc';
      includeValue?: boolean;
    },
  ): Observable<any> {
    const {
      offset = 0,
      limit = 500,
      order = 'desc',
      includeValue = true,
    } = options ?? {};
    const url = `${this.apiUrl}/${id}/history/refresh?offset=${offset}&limit=${limit}&order=${order}&includeValue=${includeValue}`;
    return this.http.post(url, {}).pipe(catchError(this.handleError));
  }

  /**
   * Creates a new artifact by sending only metadata (no file upload)
   * @param dto The artifact data including the manifest of files
   * @returns Observable of the creation status
   */
  createArtifactMetadataOnly(
    dto: CreateArtifactDTO,
  ): Observable<{ id: string }> {
    // Debug logs
    console.log('=== DEBUG: Sending metadata only ===');

    // Log each property separately to avoid truncation in console
    console.log('Metadata - title:', dto.title);
    console.log('Metadata - description:', dto.description);
    console.log('Metadata - keywords:', dto.keywords);
    console.log('Metadata - links:', dto.links);
    console.log('Metadata - dois:', dto.dois);
    console.log('Metadata - fundingAgencies:', dto.fundingAgencies);
    console.log('Metadata - acknowledgements:', dto.acknowledgements);
    console.log('Metadata - manifest:', dto.manifest);

    console.log('=== END DEBUG ===');

    // Simplemente enviamos el DTO como JSON, sin FormData ni archivos
    return this.http
      .post<{ id: string }>(this.apiUrl, dto)
      .pipe(catchError(this.handleError));
  }

  /**
   * Updates an existing artifact by sending only metadata (no file upload)
   */
  updateArtifactMetadataOnly(
    id: string,
    dto: UpdateArtifactDTO,
  ): Observable<void> {
    console.log('=== DEBUG: Updating metadata only ===');
    console.log('ID:', id);
    console.log('Manifest length:', dto.manifest?.length);
    console.log('Footprint:', dto.footprint);
    console.log('=== END DEBUG ===');

    return this.http
      .put<void>(`${this.apiUrl}/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  /**
   * Handles HTTP errors
   * @param error The error response
   * @returns An observable with a user-facing error message
   */
  private readonly handleError = (error: HttpErrorResponse) => {
    // 1) Debug always
    this.logErrorDebug(error);

    // 2) Client-side errors
    if (error.error instanceof ErrorEvent) {
      return throwError(() => new Error(error.error.message));
    }

    // 3) Special handling for 400: only pass through when message is exactly 'Invalid data'
    if (error.status === 400) {
      const body: any = (error as any)?.error;
      const messages: unknown = body?.message;
      if (Array.isArray(messages) && messages.length > 0) {
        const firstMessage = String(messages[0]);
        if (firstMessage === 'Invalid data') {
          return throwError(() => new Error(firstMessage));
        }
      }
      return throwError(() => new Error(this.getServerErrorMessage(400)));
    }

    // 4) Other statuses: prefer a specific validation message if available, else map by status
    const validationMsg = this.extractValidationMessage(error);
    if (validationMsg) {
      return throwError(() => new Error(validationMsg));
    }

    const message = this.getServerErrorMessage(error.status);
    return throwError(() => new Error(message));
  };

  private logErrorDebug(error: HttpErrorResponse): void {
    console.error('=== DEBUG: API Error ===');
    console.error('Status:', error.status);
    console.error('Error object:', error);
    if (error.error) {
      console.error('Error body:', error.error);
    }
    console.error('=== END ERROR DEBUG ===');
  }

  private extractValidationMessage(error: HttpErrorResponse): string | null {
    const body: any = error?.error;
    const messages: unknown = body?.message;
    if (Array.isArray(messages) && messages.length > 0) {
      console.error('Validation errors:');
      let index = 0;
      for (const msg of messages as string[]) {
        console.error(`[${index + 1}] ${msg}`);
        index++;
      }
      return (messages as string[])[0];
    }
    return null;
  }

  private getServerErrorMessage(status: number): string {
    const map: Record<number, string> = {
      400: 'Invalid artifact data provided.',
      401: 'You must be authenticated to create artifacts.',
      412: 'An artifact with this title already exists in the organization.',
      413: 'The file size exceeds the maximum allowed limit.',
      415: 'The file type is not supported.',
      500: 'A server error occurred. Please try again later.',
    };
    return map[status] ?? 'An error occurred while processing your request.';
  }
}
