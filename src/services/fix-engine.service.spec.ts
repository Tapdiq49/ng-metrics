import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import type { MockedFunction } from 'vitest';
import { FixEngineService } from './fix-engine.service';
import { DeadCodeAnalyzerService } from './dead-code-analyzer.service';

vi.mock('fs');

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockReaddirSync = vi.mocked(fs.readdirSync);
const mockUnlinkSync = vi.mocked(fs.unlinkSync);

describe('FixEngineService', () => {
  let service: FixEngineService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new FixEngineService();
    vi.clearAllMocks();
  });

  it('should remove risky packages from package.json', () => {
    // ARRANGE
    mockExistsSync.mockImplementation((p) => {
      return p.toString().endsWith('package.json');
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString().endsWith('package.json')) {
        return JSON.stringify({
          dependencies: {
            tslint: '^6.1.3'
          }
        });
      }
      return '';
    });

    mockWriteFileSync.mockImplementation(() => {});

    // ACT
    const result = service.apply(process.cwd(), undefined, false);

    // ASSERT
    expect(result.applied).toBe(true);

    expect(result.changes).toContainEqual({
      type: 'remove',
      package: 'tslint',
      before: '^6.1.3',
      after: '(removed)'
    });

    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('should delete dead code files using DeadCodeAnalyzerService', () => {
    // ARRANGE
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path.toString().endsWith('package.json')) {
        return JSON.stringify({});
      }
      return '';
    });
    mockReaddirSync.mockReturnValue([]);

    vi.spyOn(DeadCodeAnalyzerService.prototype, 'analyze').mockReturnValue([
      {
        file: 'C:/fake/src/app/unused.component.ts',
        issues: [
          {
            type: 'anti_pattern',
            message: "Dead Code Detected: Component 'UnusedComponent' appears to be unused.",
          }
        ]
      }
    ]);

    mockUnlinkSync.mockImplementation(vi.fn());

    // ACT
    const result = service.apply(process.cwd(), undefined, false);

    // ASSERT
    expect(result.changes.some(c => c.type === 'remove' && c.after === '(deleted as dead code)')).toBe(true);
    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});