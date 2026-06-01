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
    
    // Mock all necessary fs functions
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
    vi.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false,
      isFile: () => true
    } as unknown as fs.Stats);
  });

  it('should run full analysis successfully', () => {
    // ARRANGE
    // Make package.json exist
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      const pathStr = p as string;
      return pathStr.endsWith('package.json');
    });

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

    // ACT
    const report = service.analyze();

    // ASSERT
    expect(report.projectHealth).toBeDefined();
    expect(report.projectHealth.score).toBeLessThanOrEqual(100);
    expect(report.summary).toContain('Project Health Score');
  });
});