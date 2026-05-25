import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from './config.service';
import type { Config } from '../types';

vi.mock('fs');
vi.mock('path');

const mockExistsSync = fs.existsSync as Mock;
const mockReadFileSync = fs.readFileSync as Mock;
const mockResolve = path.resolve as Mock;
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('ConfigService', () => {
  let service: ConfigService;
  const testProjectPath = '/test/project';

  beforeEach(() => {
    service = new ConfigService();
    vi.clearAllMocks();
    consoleWarnSpy.mockClear();
    mockResolve.mockImplementation((...args: string[]) => args.join('/'));
  });

  describe('when no config files exist', () => {
    it('should return default config', () => {
      // ARRANGE
      mockExistsSync.mockReturnValue(false);

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(config).toEqual({
        srcDir: 'src',
        exclude: [],
        rules: {
          viewChildStatic: true,
          toPromise: true,
          httpModule: true,
          changeDetectionOnPush: true,
          windowDocumentReference: true,
          nativeElementManipulation: true,
          rxjsMemoryLeak: true,
          nestedSubscriptions: true,
          legacyStructuralDirectives: true,
          ngForTrackBy: true,
          forTrackByIndex: true,
          innerHtmlBinding: true,
          bypassSecurityTrust: true
        },
        minHealthScore: undefined
      });
    });
  });

  describe('when .ng-metricsrc exists', () => {
    it('should load and merge config from .ng-metricsrc', () => {
      // ARRANGE
      const userConfig: Partial<Config> = {
        srcDir: 'app',
        exclude: ['node_modules/', 'dist/'],
        rules: {
          changeDetectionOnPush: false
        }
      };

      mockExistsSync.mockImplementation((filePath: string) => filePath === `${testProjectPath}/.ng-metricsrc`);
      mockReadFileSync.mockReturnValue(JSON.stringify(userConfig));

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(mockExistsSync).toHaveBeenCalledWith(`${testProjectPath}/.ng-metricsrc`);
      expect(config.srcDir).toBe('app');
      expect(config.exclude).toEqual(['node_modules/', 'dist/']);
      expect(config.rules?.changeDetectionOnPush).toBe(false);
      expect(config.rules?.toPromise).toBe(true);
    });
  });

  describe('when .ng-metricsrc.json exists', () => {
    it('should load and merge config from .ng-metricsrc.json', () => {
      // ARRANGE
      const userConfig: Partial<Config> = {
        srcDir: 'frontend/src',
        minHealthScore: 85
      };

      mockExistsSync.mockImplementation((filePath: string) => filePath === `${testProjectPath}/.ng-metricsrc.json`);
      mockReadFileSync.mockReturnValue(JSON.stringify(userConfig));

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(mockExistsSync).toHaveBeenCalledWith(`${testProjectPath}/.ng-metricsrc.json`);
      expect(config.srcDir).toBe('frontend/src');
      expect(config.minHealthScore).toBe(85);
    });
  });

  describe('when ng-metrics.config.json exists', () => {
    it('should load and merge config from ng-metrics.config.json', () => {
      // ARRANGE
      const userConfig: Partial<Config> = {
        rules: {
          rxjsMemoryLeak: false,
          nestedSubscriptions: false
        }
      };

      mockExistsSync.mockImplementation((filePath: string) => filePath === `${testProjectPath}/ng-metrics.config.json`);
      mockReadFileSync.mockReturnValue(JSON.stringify(userConfig));

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(mockExistsSync).toHaveBeenCalledWith(`${testProjectPath}/ng-metrics.config.json`);
      expect(config.rules?.rxjsMemoryLeak).toBe(false);
      expect(config.rules?.nestedSubscriptions).toBe(false);
      expect(config.rules?.viewChildStatic).toBe(true);
    });
  });

  describe('when package.json has ngMetrics field', () => {
    it('should load and merge config from package.json ngMetrics field', () => {
      // ARRANGE
      const packageJsonContent = {
        name: 'test-app',
        ngMetrics: {
          srcDir: 'src/app',
          exclude: ['src/testing/'],
          rules: {
            innerHtmlBinding: false
          }
        } as Partial<Config>
      };

      mockExistsSync.mockImplementation((filePath: string) => filePath === `${testProjectPath}/package.json`);
      mockReadFileSync.mockReturnValue(JSON.stringify(packageJsonContent));

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(mockExistsSync).toHaveBeenCalledWith(`${testProjectPath}/package.json`);
      expect(config.srcDir).toBe('src/app');
      expect(config.exclude).toEqual(['src/testing/']);
      expect(config.rules?.innerHtmlBinding).toBe(false);
    });
  });

  describe('when config file has invalid JSON', () => {
    it('should return default config and show warning', () => {
      // ARRANGE
      mockExistsSync.mockImplementation((filePath: string) => filePath === `${testProjectPath}/.ng-metricsrc`);
      mockReadFileSync.mockReturnValue('invalid json content');

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not parse config file'));
      expect(config).toEqual(expect.objectContaining({
        srcDir: 'src',
        exclude: []
      }));
    });
  });

  describe('config file priority', () => {
    it('should prioritize .ng-metricsrc over other files', () => {
      // ARRANGE
      const ngMetricsRcConfig = { srcDir: 'from-rc' };
      const ngMetricsRcJsonConfig = { srcDir: 'from-rc-json' };
      
      mockExistsSync.mockImplementation((filePath: string) => 
        filePath === `${testProjectPath}/.ng-metricsrc` || 
        filePath === `${testProjectPath}/.ng-metricsrc.json`
      );
      
      mockReadFileSync.mockImplementation((filePath: string) => {
        if (filePath === `${testProjectPath}/.ng-metricsrc`) {
          return JSON.stringify(ngMetricsRcConfig);
        }
        return JSON.stringify(ngMetricsRcJsonConfig);
      });

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(config.srcDir).toBe('from-rc');
      expect(mockReadFileSync).not.toHaveBeenCalledWith(`${testProjectPath}/.ng-metricsrc.json`);
    });
  });

  describe('rules merging', () => {
    it('should merge user rules with defaults, overriding only specified ones', () => {
      // ARRANGE
      const userConfig: Partial<Config> = {
        rules: {
          viewChildStatic: false,
          httpModule: false
        }
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(userConfig));

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(config.rules?.viewChildStatic).toBe(false);
      expect(config.rules?.httpModule).toBe(false);
      expect(config.rules?.toPromise).toBe(true);
      expect(config.rules?.changeDetectionOnPush).toBe(true);
      expect(config.rules?.windowDocumentReference).toBe(true);
    });

    it('should handle empty rules object', () => {
      // ARRANGE
      const userConfig: Partial<Config> = {
        rules: {}
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(userConfig));

      // ACT
      const config = service.load(testProjectPath);

      // ASSERT
      expect(config.rules?.viewChildStatic).toBe(true);
      expect(config.rules?.toPromise).toBe(true);
    });
  });
});
