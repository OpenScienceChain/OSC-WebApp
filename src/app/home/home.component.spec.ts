import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ArtifactsPreviewComponent } from '../components/artifacts-preview/artifacts-preview.component';
import { WorkflowsPreviewComponent } from '../components/workflows-preview/workflows-preview.component';
import { HomeComponent } from './home.component';
import { DemoService } from '../guest/demo.service';

@Component({
  selector: 'app-artifacts-preview',
  template: '',
  standalone: true,
})
class MockArtifactsPreviewComponent {}

@Component({
  selector: 'app-workflows-preview',
  template: '',
  standalone: true,
})
class MockWorkflowsPreviewComponent {}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [{ provide: DemoService, useValue: { session: null } }],
    })
      .overrideComponent(HomeComponent, {
        remove: {
          imports: [ArtifactsPreviewComponent, WorkflowsPreviewComponent],
        },
        add: {
          imports: [
            MockArtifactsPreviewComponent,
            MockWorkflowsPreviewComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('introduces Open Science Chain and its three user paths', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.getAttribute('aria-label')).toBe(
      'Open Science Chain',
    );
    expect(root.textContent).toContain('Discover research');
    expect(root.textContent).toContain('Share your work');
    expect(root.textContent).toContain('Reproduce a process');
  });

  it('keeps live artifact and workflow previews on the landing page', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-artifacts-preview')).toBeTruthy();
    expect(root.querySelector('app-workflows-preview')).toBeTruthy();
  });
});
