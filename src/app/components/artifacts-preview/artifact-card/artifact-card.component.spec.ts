import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ArtifactCardComponent } from './artifact-card.component';
import { Artifact } from '../../../models/artifact.model';
import { By } from '@angular/platform-browser';

describe('ArtifactCardComponent', () => {
  let component: ArtifactCardComponent;
  let fixture: ComponentFixture<ArtifactCardComponent>;

  const testArtifact: Artifact = {
    id: '1',
    title: 'Test Artifact Title',
    description: 'This is a test description for the artifact.',
    keywords: ['test', 'artifact'],
    submittedAt: new Date().toISOString(),
    verified: false,
    lastTimeVerified: null,
    lastTimeUpdated: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtifactCardComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtifactCardComponent);
    component = fixture.componentInstance;
    component.artifact = testArtifact;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the artifact title', () => {
    const titleEl = fixture.debugElement.query(By.css('h3')).nativeElement;
    expect(titleEl.textContent).toContain(testArtifact.title);
  });

  it('should display the artifact description', () => {
    const descriptionEl = fixture.debugElement.query(
      By.css('.description'),
    ).nativeElement;
    expect(descriptionEl.textContent).toContain(testArtifact.description);
  });

  it('should display the last activity', () => {
    const details = fixture.nativeElement.querySelector('dl');
    expect(details.textContent).toContain('Last activity');
  });

  it('should have an accessible artifact detail link', () => {
    const link = fixture.debugElement.query(
      By.css('.card-actions a'),
    ).nativeElement;
    expect(link.childNodes[0].textContent.trim()).toBe('View');
    expect(link.textContent).toContain(testArtifact.title);
    expect(link.getAttribute('href')).toBe('/artifacts/1');
  });
});
