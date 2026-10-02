import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Workflow,
  WorkflowListItem,
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
} from '../models/workflow.model';
import { getApiBaseUrl } from './api-base-url';

@Injectable({
  providedIn: 'root',
})
export class WorkflowService {
  private get apiUrl(): string {
    return `${getApiBaseUrl()}/workflows`;
  }

  constructor(private readonly http: HttpClient) {}

  getWorkflows(): Observable<WorkflowListItem[]> {
    return this.http
      .get<WorkflowListItem[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getWorkflow(id: string): Observable<Workflow> {
    return this.http
      .get<Workflow>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createWorkflow(dto: CreateWorkflowDTO): Observable<{ id: string }> {
    return this.http
      .post<{ id: string }>(this.apiUrl, dto)
      .pipe(catchError(this.handleError));
  }

  updateWorkflow(id: string, dto: UpdateWorkflowDTO): Observable<void> {
    return this.http
      .put<void>(`${this.apiUrl}/${id}`, dto)
      .pipe(catchError(this.handleError));
  }

  private readonly handleError = (error: HttpErrorResponse) => {
    if (error.error instanceof ErrorEvent) {
      return throwError(() => new Error(error.error.message));
    }

    const body: any = error?.error;
    const messages: unknown = body?.message;
    if (Array.isArray(messages) && messages.length > 0) {
      return throwError(() => new Error(String(messages[0])));
    }

    const statusMessages: Record<number, string> = {
      400: 'Invalid workflow data provided.',
      401: 'You must be authenticated to manage workflows.',
      412: 'A workflow with this title already exists in the organization.',
      500: 'A server error occurred. Please try again later.',
    };
    const message =
      statusMessages[error.status] ??
      'An error occurred while processing your request.';
    return throwError(() => new Error(message));
  };
}
