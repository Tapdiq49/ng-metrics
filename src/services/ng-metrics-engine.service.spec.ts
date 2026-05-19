import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { NgMetricsEngineService } from './ng-metrics-engine.service';

vi.mock('fs');

describe('NgMetricsEngineService', () => {
  let service: NgMetricsEngineService;

  beforeEach(() => {
    service = new NgMetricsEngineService();
    vi.clearAllMocks();
  });

  it('should run full analysis successfully', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockImplementation((path: any) => {
      if (path.toString().endsWith('package.json')) {
        return JSON.stringify({
          dependencies: {
            '@angular/core': '^16.2.0'
          }
        });
      }
      return '';
    });
    vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

    const report = service.analyze();
    expect(report.projectHealth).toBeDefined();
    expect(report.projectHealth.score).toBeLessThanOrEqual(100);
    expect(report.summary).toContain('Project Health Score');
  });
});
