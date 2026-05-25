import { describe, it, expect, beforeEach } from 'vitest';
import { RiskAnalysisService } from './risk-analysis.service';
import type { ScanResult } from '../types';

describe('RiskAnalysisService', () => {
  let service: RiskAnalysisService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new RiskAnalysisService();
  });

  it('should score 100 for an up-to-date project without risky packages', () => {
    // ARRANGE
    const scanResult: ScanResult = {
      metadata: {
        angularVersion: '21.0.0',
        isAngular21Plus: true
      },
      packages: [
        { name: '@angular/core', version: '^21.0.0' }
      ]
    };

    // ACT
    const health = service.analyze(scanResult);

    // ASSERT
    expect(health.score).toBe(100);
    expect(health.level).toBe('excellent');
    expect(health.issues.length).toBe(0);
  });

  it('should deduct points for outdated Angular version', () => {
    // ARRANGE
    const scanResult: ScanResult = {
      metadata: {
        angularVersion: '16.0.0',
        isAngular21Plus: false
      },
      packages: [
        { name: '@angular/core', version: '^16.0.0' }
      ]
    };

    // ACT
    const health = service.analyze(scanResult);

    // ASSERT
    expect(health.score).toBeLessThan(100);
    expect(health.issues).toContain(
      'Angular version 16 is 5 versions behind latest (21)'
    );
  });

  it('should deduct points for tslint and zone.js in Angular 21', () => {
    // ARRANGE
    const scanResult: ScanResult = {
      metadata: {
        angularVersion: '21.0.0',
        isAngular21Plus: true
      },
      packages: [
        { name: '@angular/core', version: '^21.0.0' },
        { name: 'tslint', version: '^6.1.3', status: 'deprecated / risky' },
        { name: 'zone.js', version: '^0.13.0', status: 'legacy / optional' }
      ]
    };

    // ACT
    const health = service.analyze(scanResult);

    // ASSERT
    expect(health.score).toBe(75);
    expect(health.level).toBe('good');
  });
});