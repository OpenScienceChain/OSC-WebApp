import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { authRoutes } from './auth.routes';

@NgModule({
  imports: [CommonModule, RouterModule.forChild(authRoutes)],
})
export class AuthModule {}
