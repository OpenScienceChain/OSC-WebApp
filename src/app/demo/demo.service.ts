import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { getApiBaseUrl } from '../services/api-base-url';
import {
  DemoArtifact,
  DemoArtifactHistory,
  DemoArtifactRequest,
  DemoCatalogArtifact,
  DemoCatalogWorkflow,
  DemoCounters,
  DemoOrganizationSlug,
  DemoSession,
  DemoStatus,
  DemoWorkflow,
  DemoWorkflowRequest,
} from './demo.models';

const SESSION_STORAGE_KEY = 'osc-usrse26-demo-session';

@Injectable({ providedIn: 'root' })
export class DemoService {
  private currentSession: DemoSession | null = this.readSession();

  constructor(private readonly http: HttpClient) {}

  get session(): DemoSession | null {
    if (
      this.currentSession &&
      new Date(this.currentSession.expiresAt).getTime() <= Date.now()
    ) {
      this.clearSession();
    }
    return this.currentSession;
  }

  getStatus(): Observable<DemoStatus> {
    return this.http.get<DemoStatus>(this.url('/status'), {
      withCredentials: true,
    });
  }

  getCounters(): Observable<DemoCounters> {
    return this.http.get<DemoCounters>(this.url('/counters'), {
      withCredentials: true,
    });
  }

  listArtifacts(
    organization?: DemoOrganizationSlug,
  ): Observable<DemoCatalogArtifact[]> {
    const params = organization
      ? new HttpParams().set('organization', organization)
      : undefined;
    return this.http.get<DemoCatalogArtifact[]>(this.url('/artifacts'), {
      params,
      withCredentials: true,
    });
  }

  listWorkflows(
    organization?: DemoOrganizationSlug,
  ): Observable<DemoCatalogWorkflow[]> {
    const params = organization
      ? new HttpParams().set('organization', organization)
      : undefined;
    return this.http.get<DemoCatalogWorkflow[]>(this.url('/workflows'), {
      params,
      withCredentials: true,
    });
  }

  createSession(organization: DemoOrganizationSlug): Observable<DemoSession> {
    return this.http
      .post<DemoSession>(
        this.url('/session'),
        { organization },
        { withCredentials: true },
      )
      .pipe(tap((session) => this.storeSession(session)));
  }

  refreshSession(): Observable<DemoSession> {
    return this.http
      .post<DemoSession>(this.url('/session/refresh'), {}, this.mutation())
      .pipe(tap((session) => this.storeSession(session)));
  }

  createArtifact(request: DemoArtifactRequest): Observable<DemoArtifact> {
    return this.http.post<DemoArtifact>(
      this.url('/artifacts'),
      request,
      this.mutation(request.requestId),
    );
  }

  getArtifact(id: string): Observable<DemoArtifact> {
    return this.http.get<DemoArtifact>(this.url(`/artifacts/${id}`), {
      withCredentials: true,
    });
  }

  getArtifactHistory(id: string): Observable<DemoArtifactHistory> {
    return this.http.get<DemoArtifactHistory>(
      this.url(`/artifacts/${id}/history`),
      {
        headers: new HttpHeaders({ 'X-Correlation-Id': crypto.randomUUID() }),
        withCredentials: true,
      },
    );
  }

  createWorkflow(request: DemoWorkflowRequest): Observable<DemoWorkflow> {
    return this.http.post<DemoWorkflow>(
      this.url('/workflows'),
      request,
      this.mutation(request.requestId),
    );
  }

  getWorkflow(id: string): Observable<DemoWorkflow> {
    return this.http.get<DemoWorkflow>(this.url(`/workflows/${id}`), {
      withCredentials: true,
    });
  }

  getWorkflowHistory(id: string): Observable<DemoArtifactHistory> {
    return this.http.get<DemoArtifactHistory>(
      this.url(`/workflows/${id}/history`),
      {
        headers: new HttpHeaders({ 'X-Correlation-Id': crypto.randomUUID() }),
        withCredentials: true,
      },
    );
  }

  clearSession(): void {
    this.currentSession = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private url(path: string): string {
    return `${getApiBaseUrl().replace(/\/$/, '')}/demo${path}`;
  }

  private mutation(correlationId?: string): {
    headers: HttpHeaders;
    withCredentials: true;
  } {
    const session = this.session;
    let headers = new HttpHeaders({
      'X-Demo-CSRF': session?.csrfToken || '',
    });
    if (correlationId) {
      headers = headers.set('X-Correlation-Id', correlationId);
    }
    return { headers, withCredentials: true };
  }

  private storeSession(session: DemoSession): void {
    this.currentSession = session;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }

  private readSession(): DemoSession | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const value = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return value ? (JSON.parse(value) as DemoSession) : null;
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }
}
