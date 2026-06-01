import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BundleAnalyzerService } from './bundle-analyzer.service';

vi.mock('fs');

describe('BundleAnalyzerService', () => {
  let service: BundleAnalyzerService;
  const mockProjectPath = '/user/project';

  beforeEach(() => {
    service = new BundleAnalyzerService();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null if no distribution directory is found', () => {
    // ARRANGE
    const existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockReturnValue(false);

    // ACT
    const result = service.analyze(mockProjectPath);

    // ASSERT
    expect(result).toBeNull();
  });

  it('should return null if distribution directory exists but contains no bundle files', () => {
    // ARRANGE
    const mockDistPath = path.join(mockProjectPath, 'dist');

    const existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((p) => String(p) === mockDistPath);

    const statSyncSpy = vi.spyOn(fs, 'statSync');
    statSyncSpy.mockImplementation(() => ({
      isDirectory: () => true,
      size: 0
    } as fs.Stats));

    const readdirSyncSpy = vi.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    // ACT
    const result = service.analyze(mockProjectPath);

    // ASSERT
    expect(result).toBeNull();
  });

  it('should successfully analyze bundle files and calculate totals', () => {
    // ARRANGE
    const customDistPath = 'dist/browser';
    const fullCustomDistPath = path.resolve(mockProjectPath, customDistPath);
    const mockMainJsPath = path.join(fullCustomDistPath, 'main.js');
    const mockVendorJsPath = path.join(fullCustomDistPath, 'vendor.js');

    const existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      return pathStr === fullCustomDistPath || pathStr === mockMainJsPath || pathStr === mockVendorJsPath;
    });

    const statSyncSpy = vi.spyOn(fs, 'statSync');
    statSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr === fullCustomDistPath) {
        return {
          isDirectory: () => true,
          size: 0
        } as fs.Stats;
      }
      if (pathStr === mockMainJsPath) {
        return {
          isDirectory: () => false,
          size: 500 * 1024
        } as fs.Stats;
      }
      if (pathStr === mockVendorJsPath) {
        return {
          isDirectory: () => false,
          size: 100 * 1024
        } as fs.Stats;
      }
      return {
        isDirectory: () => false,
        size: 0
      } as fs.Stats;
    });

    const readdirSyncSpy = vi.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockImplementation(((p) => {
      const pathStr = String(p);
      if (pathStr === fullCustomDistPath) {
        return ['main.js', 'vendor.js'];
      }
      return [];
    }) as typeof fs.readdirSync);

    // ACT
    const result = service.analyze(mockProjectPath, customDistPath);

    // ASSERT
    expect(result).not.toBeNull();
    expect(result?.totalSizeBytes).toBe(600 * 1024);
    expect(result?.totalSizeHumanReadable).toBe('600 KB');
    expect(result?.files).toHaveLength(2);

    const mainFile = result?.files.find((f) => f.type === 'main');
    expect(mainFile).toBeDefined();
    expect(mainFile?.sizeHumanReadable).toBe('500 KB');
    expect(mainFile?.path).toBe(path.join('dist', 'browser', 'main.js'));
  });

  it('should generate warning when main bundle exceeds threshold', () => {
    // ARRANGE
    const mockDistPath = path.join(mockProjectPath, 'dist');
    const mockBrowserPath = path.join(mockDistPath, 'browser');
    const mockMainJsPath = path.join(mockBrowserPath, 'main.js');

    const existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      return pathStr === mockDistPath || pathStr === mockBrowserPath || pathStr === mockMainJsPath;
    });

    const statSyncSpy = vi.spyOn(fs, 'statSync');
    statSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr === mockDistPath || pathStr === mockBrowserPath) {
        return {
          isDirectory: () => true,
          size: 0
        } as fs.Stats;
      }
      return {
        isDirectory: () => false,
        size: 1.5 * 1024 * 1024
      } as fs.Stats;
    });

    const readdirSyncSpy = vi.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockImplementation(((p) => {
      const pathStr = String(p);
      if (pathStr === mockDistPath) {
        return ['browser'];
      }
      if (pathStr === mockBrowserPath) {
        return ['main.js'];
      }
      return [];
    }) as typeof fs.readdirSync);

    // ACT
    const result = service.analyze(mockProjectPath);

    // ASSERT
    expect(result).not.toBeNull();
    expect(result?.warnings).toBeDefined();
    const mainWarning = result?.warnings.find((w) => w.includes('Main bundle') && w.includes('larger than recommended'));
    expect(mainWarning).toBeDefined();
  });

  it('should generate recommendation when vendor bundle is large', () => {
    // ARRANGE
    const mockDistPath = path.join(mockProjectPath, 'dist');
    const mockBrowserPath = path.join(mockDistPath, 'browser');
    const mockVendorJsPath = path.join(mockBrowserPath, 'vendor.js');

    const existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      return pathStr === mockDistPath || pathStr === mockBrowserPath || pathStr === mockVendorJsPath;
    });

    const statSyncSpy = vi.spyOn(fs, 'statSync');
    statSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr === mockDistPath || pathStr === mockBrowserPath) {
        return {
          isDirectory: () => true,
          size: 0
        } as fs.Stats;
      }
      return {
        isDirectory: () => false,
        size: 600 * 1024
      } as fs.Stats;
    });

    const readdirSyncSpy = vi.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockImplementation(((p) => {
      const pathStr = String(p);
      if (pathStr === mockDistPath) {
        return ['browser'];
      }
      if (pathStr === mockBrowserPath) {
        return ['vendor.js'];
      }
      return [];
    }) as typeof fs.readdirSync);

    // ACT
    const result = service.analyze(mockProjectPath);

    // ASSERT
    expect(result).not.toBeNull();
    expect(result?.recommendations).toBeDefined();
    const vendorRec = result?.recommendations.find((r) => r.includes('Vendor bundle is large'));
    expect(vendorRec).toBeDefined();
  });

  it('should correctly classify custom bundle types', () => {
    // ARRANGE
    const mockDistPath = path.join(mockProjectPath, 'dist');
    const mockBrowserPath = path.join(mockDistPath, 'browser');
    const mockPolyfillPath = path.join(mockBrowserPath, 'polyfill.js');
    const mockChunkPath = path.join(mockBrowserPath, 'chunk.js');
    const mockUnknownPath = path.join(mockBrowserPath, 'unknown-file.mjs');

    const existsSyncSpy = vi.spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      return (
        pathStr === mockDistPath ||
        pathStr === mockBrowserPath ||
        pathStr === mockPolyfillPath ||
        pathStr === mockChunkPath ||
        pathStr === mockUnknownPath
      );
    });

    const statSyncSpy = vi.spyOn(fs, 'statSync');
    statSyncSpy.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr === mockDistPath || pathStr === mockBrowserPath) {
        return {
          isDirectory: () => true,
          size: 0
        } as fs.Stats;
      }
      return {
        isDirectory: () => false,
        size: 100
      } as fs.Stats;
    });

    const readdirSyncSpy = vi.spyOn(fs, 'readdirSync');
    readdirSyncSpy.mockImplementation(((p) => {
      const pathStr = String(p);
      if (pathStr === mockDistPath) {
        return ['browser'];
      }
      if (pathStr === mockBrowserPath) {
        return ['polyfill.js', 'chunk.js', 'unknown-file.mjs'];
      }
      return [];
    }) as typeof fs.readdirSync);

    // ACT
    const result = service.analyze(mockProjectPath);

    // ASSERT
    expect(result).not.toBeNull();
    const polyfill = result?.files.find((f) => f.path.includes('polyfill.js'));
    const chunk = result?.files.find((f) => f.path.includes('chunk.js'));
    const other = result?.files.find((f) => f.path.includes('unknown-file.mjs'));

    expect(polyfill?.type).toBe('polyfills');
    expect(chunk?.type).toBe('chunk');
    expect(other?.type).toBe('other');
  });
});
