import { describe, it, expect, beforeEach } from 'vitest';
import { MigrationAdvisorService } from './migration-advisor.service';
import { ScanResult } from './package-scanner.service';
import { FileAnalysisResult } from './code-analysis.service';

describe('MigrationAdvisorService', () => {
  let service: MigrationAdvisorService;

  beforeEach(() => {
    service = new MigrationAdvisorService();
  });

  it('should advise on zoneless migration when zone.js is found on Angular 21+', () => {
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: true, angularVersion: '21.0.0' },
      packages: [{ name: 'zone.js', version: '^0.14.0' }]
    };
    const codeResults: FileAnalysisResult[] = [];

    const steps = service.advise(scanResult, codeResults);
    expect(steps.length).toBe(1);
    expect(steps[0].title).toBe('Migrate to Zoneless Architecture');
  });

  it('should advise on control flow migration when anti_pattern is found', () => {
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: false, angularVersion: '16.0.0' },
      packages: []
    };
    const codeResults: FileAnalysisResult[] = [
      {
        file: 'test.html',
        issues: [{ type: 'anti_pattern', message: 'Legacy structural directive syntax' }]
      }
    ];

    const steps = service.advise(scanResult, codeResults);
    expect(steps.some(s => s.title === 'Migrate to Angular 17+ Control Flow')).toBe(true);
  });

  it('should advise on RxJS fixes when rxjs_issue is found', () => {
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: false },
      packages: []
    };
    const codeResults: FileAnalysisResult[] = [
      {
        file: 'test.ts',
        issues: [{ type: 'rxjs_issue', message: 'Nested subscription' }]
      }
    ];

    const steps = service.advise(scanResult, codeResults);
    expect(steps.some(s => s.title === 'Fix RxJS Bad Patterns')).toBe(true);
  });
});
