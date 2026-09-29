import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from '../services/api-base-url';
import { ShowcaseCatalog, ShowcaseHistory } from './showcase.models';

@Injectable({ providedIn: 'root' })
export class ShowcaseService {
  constructor(private readonly http: HttpClient) {}

  catalog(): Observable<ShowcaseCatalog> {
    return this.http.get<ShowcaseCatalog>(`${getApiBaseUrl()}/showcase`);
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
