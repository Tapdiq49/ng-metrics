import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BundleAnalyzerService } from './bundle-analyzer.service';

// Don't fully mock path so we can use the actual implementation
vi.mock('fs');

describe('BundleAnalyzerService', () => {
  let service: BundleAnalyzerService;

  beforeEach(() => {
    service = new BundleAnalyzerService();
    vi.clearAllMocks();
    // Mock fs.existsSync and fs.statSync properly
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
  });

  it('should return null when no dist directory is found', () => {
    // ACT
    const result = service.analyze();

    // ASSERT
    expect(result).toBeNull();
  });

  it('should analyze bundle files when they exist (simple case)', () => {
    // ARRANGE
    const mockFiles = ['main.js', 'styles.css'];
    
    // Mock existsSync to return true for our test paths
    vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
      const pathStr = p as string;
      return pathStr.includes('dist') || pathStr.includes('main.js');
    });
    
    // Mock statSync
    vi.spyOn(fs, 'statSync').mockImplementation((p) => {
      const pathStr = p as string;
      if (pathStr.includes('dist') && !pathStr.includes('.')) {
        return {
          isDirectory: () => true,
          isFile: () => false
        } as unknown as fs.Stats;
      }
      return {
        isDirectory: () => false,
        isFile: () => true,
        size: 100000 // ~100KB
      } as unknown as fs.Stats;
    });
    
    // Mock readdirSync
    vi.spyOn(fs, 'readdirSync').mockImplementation((p) => {
      const pathStr = p as string;
      if (pathStr.includes('dist')) {
        return mockFiles;
      }
      return [];
    });
    
    // ACT
    const result = service.analyze('/test/project');

    // ASSERT
    expect(result).not.toBeNull();
    expect(result?.files.length).toBeGreaterThan(0);
  });
});
