import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ShowcaseComponent } from './showcase.component';
import { ShowcaseCatalog } from './showcase.models';
import { ShowcaseService } from './showcase.service';

const artifactId = '11111111-1111-4111-8111-111111111111';
const txId = 'fabric-example-tx-1';
const hash = 'a'.repeat(64);

function catalog(state: 'SUCCESS' | 'PENDING'): ShowcaseCatalog {
  return {
    organization: 'Magnetic Arch Plasma Showcase',
    ready: state === 'SUCCESS',
    source: {
      title: 'Magnetic arch plasma expansion',
      doi: '10.5281/zenodo.13987138',
      url: 'https://zenodo.org/records/13987138',
      creators: ['Celian Boye'],
      collected: '2023-02 to 2023-03',
      licenseNote: 'Consult the source record.',
    },
    artifacts: [
      {
        id: artifactId,
        title: 'S0 - source configuration',
        description: 'A curated configuration with angle-labeled measurements.',
        organizationSlug: 'magnetic-arch-plasma-showcase',
        submissionState: state,
        submittedAt: '2026-09-29T00:00:00Z',
        updatedAt: null,
        blockchainTxId: state === 'SUCCESS' ? txId : null,
        footprint: hash,
        manifest: [
          {
            filename: 'S0_-10deg.csv',
            hash,
            algorithm: 'sha256',
            probe: 'RPA',
            angleDegrees: -10,
          },
        ],
        keywords: ['plasma'],
        links: [],
        dois: [],
        submissionComment: 'Curation of published measurement hashes.',
      },
    ],
    workflows: [],
  };
}

describe('ShowcaseComponent', () => {
  async function create(state: 'SUCCESS' | 'PENDING') {
    const service = {
      catalog: jasmine.createSpy('catalog').and.returnValue(of(catalog(state))),
      history: jasmine.createSpy('history').and.returnValue(
        of({
          items: [
            {
              txId,
              timestamp: '2026-09-29T00:00:00Z',
              revision: 1,
              snapshot: { footprint: hash, manifest: [] },
            },
          ],
          count: 1,
          hasMore: false,
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [ShowcaseComponent],
      providers: [
        provideRouter([]),
        { provide: ShowcaseService, useValue: service },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShowcaseComponent);
    fixture.detectChanges();
    return { fixture, service };
  }

  it('shows measurement metadata and retrieves confirmed Fabric history on demand', async () => {
    const { fixture, service } = await create('SUCCESS');
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain(
      'Magnetic arch plasma',
    );
    expect(page.textContent).toContain('S0_-10deg.csv');
    expect(page.textContent).toContain('-10 degrees');
    const button = Array.from(page.querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Show ledger history'),
    );
    expect(button).toBeTruthy();
    button?.click();
    fixture.detectChanges();
    expect(service.history).toHaveBeenCalledOnceWith('artifacts', artifactId);
    expect(
      page.querySelector('#artifact-ledger-history')?.textContent,
    ).toContain(txId);
  });

  it('does not present an unconfirmed record as Fabric proof', async () => {
    const { fixture, service } = await create('PENDING');
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('No confirmed Fabric transaction');
    expect(page.textContent).not.toContain('Submission confirmed');
    expect(service.history).not.toHaveBeenCalled();
  });
});
