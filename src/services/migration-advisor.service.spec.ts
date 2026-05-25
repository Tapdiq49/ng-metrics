import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationAdvisorService } from './migration-advisor.service';
import type { FileAnalysisResult, ScanResult } from '../types';

describe('MigrationAdvisorService', () => {
  let service: MigrationAdvisorService;

  beforeEach(() => {
    // ARRANGE
    service = new MigrationAdvisorService();
  });

  it('should advise on zoneless migration when zone.js is found on Angular 21+', () => {
    // ARRANGE
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: true, angularVersion: '21.0.0' },
      packages: [{ name: 'zone.js', version: '^0.14.0' }]
    };

    const codeResults: FileAnalysisResult[] = [];

    // ACT
    const steps = service.advise(scanResult, codeResults);

    // ASSERT
    expect(steps.length).toBe(1);
    expect(steps[0].title).toBe('Migrate to Zoneless Architecture');
  });

  it('should advise on control flow migration when anti_pattern is found', () => {
    // ARRANGE
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: false, angularVersion: '16.0.0' },
      packages: []
    };

    const codeResults: FileAnalysisResult[] = [
      {
        file: 'test.html',
        issues: [
          {
            type: 'anti_pattern',
            message: 'Legacy structural directive syntax'
          }
        ]
      }
    ];

    // ACT
    const steps = service.advise(scanResult, codeResults);

    // ASSERT
    expect(
      steps.some(s => s.title === 'Migrate to Angular 17+ Control Flow')
    ).toBe(true);
  });

  it('should advise on RxJS fixes when rxjs_issue is found', () => {
    // ARRANGE
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: false },
      packages: []
    };

    const codeResults: FileAnalysisResult[] = [
      {
        file: 'test.ts',
        issues: [
          {
            type: 'rxjs_issue',
            message: 'Nested subscription'
          }
        ]
      }
    ];

    // ACT
    const steps = service.advise(scanResult, codeResults);

    // ASSERT
    expect(
      steps.some(s => s.title === 'Fix RxJS Bad Patterns')
    ).toBe(true);
  });
});