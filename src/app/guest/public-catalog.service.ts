import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { ArtifactService } from '../artifacts/services/artifact.service';
import { WorkflowService } from '../services/workflow.service';
import { ShowcaseService } from '../showcase/showcase.service';
import { ShowcaseCatalog, ShowcaseHistory } from '../showcase/showcase.models';
import {
  DemoArtifactHistory,
  DemoCatalogArtifact,
  DemoCatalogWorkflow,
} from './demo.models';
import { DemoService } from './demo.service';

@Injectable({ providedIn: 'root' })
export class PublicCatalogService {
  constructor(
    private readonly demo: DemoService,
    private readonly showcase: ShowcaseService,
    private readonly artifacts: ArtifactService,
    private readonly workflows: WorkflowService,
  ) {}

  artifact(id: string): Observable<DemoCatalogArtifact> {
    return this.demo.getPublicArtifact(id).pipe(
      catchError((error: unknown) => {
        if (!this.isNotFound(error)) return throwError(() => error);
        return this.showcase.examples().pipe(
          switchMap(({ examples }) => {
            const example = examples.find((item) =>
              item.artifacts.some((artifact) => artifact.id === id),
            );
            if (example) return this.curatedArtifact(example, id);
            return this.artifacts.getArtifactById(id).pipe(
              map((artifact) => ({
                id: artifact.id,
                title: artifact.title,
                description: artifact.description,
                organization: artifact.organization.name,
                organizationSlug: '',
                contributorAlias: artifact.submitterUsername,
                researchContext: null,
                verified: artifact.verified,
                submissionState: artifact.submissionState,
                submittedAt: artifact.submittedAt,
                lastUpdatedAt: artifact.updatedAt ?? undefined,
                blockchainTxId: artifact.blockchainTxId,
                manifest: artifact.manifest,
                footprint: artifact.footprint,
                keywords: artifact.keywords,
                links: artifact.links,
                dois: artifact.dois,
                fundingAgencies: artifact.fundingAgencies,
                acknowledgements: artifact.acknowledgements,
                submissionComment: artifact.submission_comment ?? undefined,
              })),
            );
          }),
        );
      }),
    );
  }

  workflow(id: string): Observable<DemoCatalogWorkflow> {
    return this.demo.getPublicWorkflow(id).pipe(
      catchError((error: unknown) => {
        if (!this.isNotFound(error)) return throwError(() => error);
        return this.showcase.examples().pipe(
          switchMap(({ examples }) => {
            const example = examples.find((item) =>
              item.workflows.some((workflow) => workflow.id === id),
            );
            if (example) return this.curatedWorkflow(example, id);
            return this.workflows.getWorkflow(id).pipe(
              map((workflow) => ({
                id: workflow.id,
                title: workflow.title,
                description: workflow.description,
                organization: workflow.organization?.name ?? '',
                organizationSlug: '',
                contributorAlias: workflow.submitterUsername,
                researchContext: null,
                keywords: workflow.keywords,
                submissionComment: workflow.submission_comment,
                artifactIds: workflow.artifacts.map((artifact) => artifact.id),
                submissionState: workflow.submissionState,
                submittedAt: String(workflow.submittedAt),
                blockchainTxId: workflow.blockchainTxId,
              })),
            );
          }),
        );
      }),
    );
  }

  history(
    type: 'artifact' | 'workflow',
    id: string,
  ): Observable<DemoArtifactHistory> {
    const demoHistory =
      type === 'artifact'
        ? this.demo.getPublicArtifactHistory(id)
        : this.demo.getPublicWorkflowHistory(id);
    return demoHistory.pipe(
      catchError((error: unknown) => {
        if (!this.isNotFound(error)) return throwError(() => error);
        return this.showcase.examples().pipe(
          switchMap(({ examples }) => {
            const example = examples.find((item) =>
              type === 'artifact'
                ? item.artifacts.some((artifact) => artifact.id === id)
                : item.workflows.some((workflow) => workflow.id === id),
            );
            if (!example) return throwError(() => error);
            return this.showcase
              .exampleHistory(
                example.key,
                type === 'artifact' ? 'artifacts' : 'workflows',
                id,
              )
              .pipe(
                map((history: ShowcaseHistory) => ({
                  artifactId: id,
                  items: history.items,
                  count: history.count,
                })),
              );
          }),
        );
      }),
    );
  }

  private curatedArtifact(
    example: ShowcaseCatalog,
    id: string,
  ): Observable<DemoCatalogArtifact> {
    const artifact = example.artifacts.find((item) => item.id === id)!;
    return of({
      id: artifact.id,
      title: artifact.title,
      description: artifact.description,
      organization: example.organization,
      organizationSlug: artifact.organizationSlug,
      contributorAlias: 'OSC curator',
      researchContext: null,
      verified: false,
      submissionState: artifact.submissionState,
      submittedAt: artifact.submittedAt,
      lastUpdatedAt: artifact.updatedAt ?? undefined,
      blockchainTxId: artifact.blockchainTxId,
      manifest: artifact.manifest,
      footprint: artifact.footprint ?? undefined,
      keywords: artifact.keywords,
      links: artifact.links,
      dois: artifact.dois,
      submissionComment: artifact.submissionComment,
    });
  }

  private curatedWorkflow(
    example: ShowcaseCatalog,
    id: string,
  ): Observable<DemoCatalogWorkflow> {
    const workflow = example.workflows.find((item) => item.id === id)!;
    return of({
      id: workflow.id,
      title: workflow.title,
      description: workflow.description,
      organization: example.organization,
      organizationSlug: workflow.organizationSlug,
      contributorAlias: 'OSC curator',
      researchContext: null,
      artifactIds: workflow.artifactIds,
      submissionState: workflow.submissionState,
      submittedAt: workflow.submittedAt,
      blockchainTxId: workflow.blockchainTxId,
    });
  }

  private isNotFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }
}
