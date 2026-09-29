import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from '../services/api-base-url';
import {
  ShowcaseCatalog,
  ShowcaseExamples,
  ShowcaseHistory,
} from './showcase.models';

@Injectable({ providedIn: 'root' })
export class ShowcaseService {
  constructor(private readonly http: HttpClient) {}

  catalog(): Observable<ShowcaseCatalog> {
    return this.http.get<ShowcaseCatalog>(`${getApiBaseUrl()}/showcase`);
  }

  examples(): Observable<ShowcaseExamples> {
    return this.http.get<ShowcaseExamples>(
      `${getApiBaseUrl()}/showcase/examples`,
    );
  }

  exampleHistory(
    key: string,
    type: 'artifacts' | 'workflows',
    id: string,
  ): Observable<ShowcaseHistory> {
    return this.http.get<ShowcaseHistory>(
      `${getApiBaseUrl()}/showcase/examples/${encodeURIComponent(key)}/${type}/${encodeURIComponent(id)}/history`,
    );
  }

  history(
    type: 'artifacts' | 'workflows',
    id: string,
  ): Observable<ShowcaseHistory> {
    return this.http.get<ShowcaseHistory>(
      `${getApiBaseUrl()}/showcase/${type}/${encodeURIComponent(id)}/history`,
    );
  }
}
