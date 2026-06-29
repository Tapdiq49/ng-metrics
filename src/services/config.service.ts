import * as fs from 'fs';
import * as path from 'path';
import type { Config, ConfigFile } from '../types';

export class ConfigService {
  private static readonly CONFIG_FILE_NAMES = [
    '.ng-metricsrc',
    '.ng-metricsrc.json',
    'ng-metrics.config.json',
    'package.json'
  ];

  private defaultConfig: Config = {
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
    minHealthScore: undefined,
    useAst: false
  };

  /**
   * Loads the configuration from the project directory.
   * Searches for config files in the following order:
   * - .ng-metricsrc
   * - .ng-metricsrc.json
   * - ng-metrics.config.json
   * - package.json (ngMetrics field)
   */
  public load(projectPath: string = process.cwd()): Config {
    for (const fileName of ConfigService.CONFIG_FILE_NAMES) {
      const filePath = path.resolve(projectPath, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const configData = JSON.parse(fileContent);
          
          let userConfig: Config | undefined;
          if (fileName === 'package.json') {
            userConfig = (configData as ConfigFile).ngMetrics;
          } else {
            userConfig = configData as Config;
          }

          if (userConfig) {
            this.warnUnknownKeys(userConfig, filePath);
            return this.mergeWithDefaults(userConfig);
          }
        } catch (error) {
          console.warn(`Warning: Could not parse config file ${filePath}, using defaults`);
        }
      }
    }
    return { ...this.defaultConfig };
  }

  /** Known top-level config keys — used for typo detection */
  private static readonly KNOWN_CONFIG_KEYS: ReadonlySet<string> = new Set([
    'srcDir', 'exclude', 'rules', 'minHealthScore', 'useAst'
  ]);

  /**
   * Warns about any top-level keys in userConfig that are not recognised.
   * Helps users catch typos (e.g. 'rule' instead of 'rules') early.
   */
  private warnUnknownKeys(userConfig: Config, filePath: string): void {
    for (const key of Object.keys(userConfig)) {
      if (!ConfigService.KNOWN_CONFIG_KEYS.has(key)) {
        console.warn(`[ng-metrics] Warning: Unknown config key "${key}" in ${filePath}. Valid keys: ${[...ConfigService.KNOWN_CONFIG_KEYS].join(', ')}`);
      }
    }
  }

  private mergeWithDefaults(userConfig: Config): Config {
    // Validate srcDir is a string
    if (userConfig.srcDir !== undefined && typeof userConfig.srcDir !== 'string') {
      console.warn('[ng-metrics] Warning: srcDir must be a string, using default');
      userConfig.srcDir = undefined;
    }

    // Validate exclude is an array
    if (userConfig.exclude !== undefined && !Array.isArray(userConfig.exclude)) {
      console.warn('[ng-metrics] Warning: exclude must be an array, using default');
      userConfig.exclude = undefined;
    }

    // Validate minHealthScore is a number between 0 and 100
    if (userConfig.minHealthScore !== undefined) {
      if (typeof userConfig.minHealthScore !== 'number') {
        console.warn('[ng-metrics] Warning: minHealthScore must be a number, using default');
        userConfig.minHealthScore = undefined;
      } else if (userConfig.minHealthScore < 0 || userConfig.minHealthScore > 100) {
        console.warn('[ng-metrics] Warning: minHealthScore must be between 0 and 100, using default');
        userConfig.minHealthScore = undefined;
      }
    }

    // Validate useAst is a boolean
    if (userConfig.useAst !== undefined && typeof userConfig.useAst !== 'boolean') {
      console.warn('[ng-metrics] Warning: useAst must be a boolean, using default');
      userConfig.useAst = undefined;
    }

    return {
      ...this.defaultConfig,
      ...userConfig,
      rules: {
        ...this.defaultConfig.rules,
        ...userConfig.rules
      }
    };
  }
}
