import { Routes } from '@angular/router';
import { canCreateArtifactGuard } from './guards/role.guard';
import { authGuard } from './guards/auth.guard';
import { guestModeMatch } from './guest/guest-mode.match';

// Componente vacío para la ruta raíz
export const routes: Routes = [
  { path: 'demo', pathMatch: 'full', redirectTo: 'list-artifacts' },
  { path: 'demo/contribute', redirectTo: 'contribute' },
  { path: 'demo/workflows/new', redirectTo: 'create-workflow' },
  { path: 'demo/artifacts/:id/edit', redirectTo: 'update-artifact/:id' },
  { path: 'demo/artifacts/:id/history', redirectTo: 'artifacts/:id/history' },
  { path: 'demo/artifacts/:id', redirectTo: 'artifacts/:id' },
  { path: 'demo/workflows/:id/history', redirectTo: 'workflows/:id/history' },
  { path: 'demo/workflows/:id', redirectTo: 'workflows/:id' },
  {
    path: 'contribute',
    canMatch: [guestModeMatch],
    loadComponent: () =>
      import('./guest/guest-artifact-form.component').then(
        (m) => m.GuestArtifactFormComponent,
      ),
  },
  {
    path: 'create-workflow',
    canMatch: [guestModeMatch],
    loadComponent: () =>
      import('./guest/guest-workflow-form.component').then(
        (m) => m.GuestWorkflowFormComponent,
      ),
  },
  {
    path: 'update-artifact/:id',
    canMatch: [guestModeMatch],
    loadComponent: () =>
      import('./guest/guest-artifact-form.component').then(
        (m) => m.GuestArtifactFormComponent,
      ),
  },
  {
    path: 'update-workflow/:id',
    canMatch: [guestModeMatch],
    loadComponent: () =>
      import('./guest/guest-workflow-detail.component').then(
        (m) => m.GuestWorkflowDetailComponent,
      ),
  },
  {
    path: 'artifacts/:id/history/:txId',
    canMatch: [guestModeMatch],
    data: { recordType: 'artifact' },
    loadComponent: () =>
      import('./guest/guest-history.component').then(
        (m) => m.GuestHistoryComponent,
      ),
  },
  {
    path: 'artifacts/:id/history',
    canMatch: [guestModeMatch],
    data: { recordType: 'artifact' },
    loadComponent: () =>
      import('./guest/guest-history.component').then(
        (m) => m.GuestHistoryComponent,
      ),
  },
  {
    path: 'artifacts/:id',
    canMatch: [guestModeMatch],
    loadComponent: () =>
      import('./guest/guest-artifact-detail.component').then(
        (m) => m.GuestArtifactDetailComponent,
      ),
  },
  {
    path: 'workflows/:id/history',
    canMatch: [guestModeMatch],
    data: { recordType: 'workflow' },
    loadComponent: () =>
      import('./guest/guest-history.component').then(
        (m) => m.GuestHistoryComponent,
      ),
  },
  {
    path: 'workflows/:id',
    canMatch: [guestModeMatch],
    loadComponent: () =>
      import('./guest/guest-workflow-detail.component').then(
        (m) => m.GuestWorkflowDetailComponent,
      ),
  },
  // Root path
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },

  // Módulo de autenticación
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },

  // Artifacts module
  {
    path: 'artifacts',
    loadChildren: () =>
      import('./artifacts/artifacts.module').then((m) => m.ArtifactsModule),
  },

  // list artifacts
  {
    path: 'list-artifacts',
    loadComponent: () =>
      import('./artifacts/list-artifact/list-artifact.component').then(
        (m) => m.ListArtifactComponent,
      ),
  },

  // list workflows
  {
    path: 'list-workflows',
    loadComponent: () =>
      import('./components/list-workflows/list-workflows.component').then(
        (m) => m.ListWorkflowsComponent,
      ),
  },

  // Workflow detail
  {
    path: 'workflows/:id',
    loadComponent: () =>
      import('./components/workflow-detail/workflow-detail.component').then(
        (m) => m.WorkflowDetailComponent,
      ),
  },

  // Create workflow
  {
    path: 'create-workflow',
    loadComponent: () =>
      import('./components/create-workflow/create-workflow.component').then(
        (m) => m.CreateWorkflowComponent,
      ),
    canActivate: [canCreateArtifactGuard],
  },

  // Update workflow
  {
    path: 'update-workflow/:id',
    loadComponent: () =>
      import('./components/update-workflow/update-workflow.component').then(
        (m) => m.UpdateWorkflowComponent,
      ),
    canActivate: [canCreateArtifactGuard],
  },

  // Ruta protegida para crear artefactos (verifica autenticación y rol)
  {
    path: 'contribute',
    loadComponent: () =>
      import('./artifacts/create-artifact/create-artifact.component').then(
        (m) => m.CreateArtifactComponent,
      ),
    canActivate: [canCreateArtifactGuard],
  },

  // Ruta para la página de acceso prohibido
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./auth/auth-forbidden/auth-forbidden.component').then(
        (m) => m.AuthForbiddenComponent,
      ),
  },

  // Artifact detail
  {
    path: 'artifacts/:id',
    loadComponent: () =>
      import('./artifacts/detail-artifact/detail-artifact.component').then(
        (m) => m.DetailArtifactComponent,
      ),
  },
  // Artifact history (standalone component)
  {
    path: 'artifacts/:id/history',
    loadComponent: () =>
      import('./artifacts/get-history/get-history.component').then(
        (m) => m.GetHistoryComponent,
      ),
    canActivate: [authGuard],
  },
  // History detail snapshot
  {
    path: 'artifacts/:id/history/:txId',
    loadComponent: () =>
      import('./artifacts/history-detail/history-detail.component').then(
        (m) => m.HistoryDetailComponent,
      ),
    canActivate: [authGuard],
  },
  // Update artifact
  {
    path: 'update-artifact/:id',
    loadComponent: () =>
      import('./artifacts/update-artifact/update-artifact.component').then(
        (m) => m.UpdateArtifactComponent,
      ),
    canActivate: [canCreateArtifactGuard],
  },

  // Ruta de fallback para cualquier ruta no definida
  { path: '**', redirectTo: '' },
];
