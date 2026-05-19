import { describe, it, expect, beforeEach } from 'vitest';
import { FixSuggestionService } from './fix-suggestion.service';
import { HealthScore } from './risk-analysis.service';
import { ScanResult } from './package-scanner.service';

describe('FixSuggestionService', () => {
  let service: FixSuggestionService;

  beforeEach(() => {
    service = new FixSuggestionService();
  });

  it('should generate autofixable suggestions for tslint and codelyzer', () => {
    const healthScore: HealthScore = {
      score: 75,
      level: 'good',
      issues: [
        'Found risky package(s): tslint',
        'Found risky package(s): codelyzer'
      ]
    };
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: false },
      packages: []
    };

    const result = service.generate(healthScore, scanResult);
    expect(result.autoFixable.length).toBe(2);
    expect(result.manualReviewRequired.length).toBe(0);
    expect(result.autoFixable[0].suggestion).toContain('Migrate from tslint to eslint');
  });

  it('should generate manual review suggestions for Angular upgrades', () => {
    const healthScore: HealthScore = {
      score: 50,
      level: 'warning',
      issues: [
        'Angular version 18 is 3 versions behind latest (21)'
      ]
    };
    const scanResult: ScanResult = {
      metadata: { isAngular21Plus: false },
      packages: []
    };

    const result = service.generate(healthScore, scanResult);
    expect(result.autoFixable.length).toBe(0);
    expect(result.manualReviewRequired.length).toBe(1);
    expect(result.manualReviewRequired[0].suggestion).toContain('ng update @angular/core@19 @angular/cli@19');
  });
});
