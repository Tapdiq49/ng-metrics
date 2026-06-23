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
