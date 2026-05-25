import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import type { MockedFunction } from 'vitest';
import { FixEngineService } from './fix-engine.service';

vi.mock('fs');

const mockExistsSync = fs.existsSync as MockedFunction<typeof fs.existsSync>;
const mockReadFileSync = fs.readFileSync as MockedFunction<typeof fs.readFileSync>;
const mockWriteFileSync = fs.writeFileSync as MockedFunction<typeof fs.writeFileSync>;

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
});