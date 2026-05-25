import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { NgMetricsEngineService } from './ng-metrics-engine.service';

vi.mock('fs');

describe('NgMetricsEngineService', () => {
  let service: NgMetricsEngineService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new NgMetricsEngineService();
    vi.clearAllMocks();
  });

  it('should run full analysis successfully', () => {
    // ARRANGE
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    vi.spyOn(fs, 'readFileSync').mockImplementation((path) => {
      const p = path.toString();

      return p.endsWith('package.json')
        ? JSON.stringify({
            dependencies: {
              '@angular/core': '^16.2.0',
            },
          })
        : '';
    });

    vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

    // ACT
    const report = service.analyze();

    // ASSERT
    expect(report.projectHealth).toBeDefined();
    expect(report.projectHealth.score).toBeLessThanOrEqual(100);
    expect(report.summary).toContain('Project Health Score');
  });
});