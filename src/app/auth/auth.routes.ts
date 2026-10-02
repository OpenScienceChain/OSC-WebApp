import { Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { ContributorAuthComponent } from './contributor-auth/contributor-auth.component';

export const authRoutes: Routes = [
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: ContributorAuthComponent },
  { path: 'team-sign-in', component: SignInComponent },
];
