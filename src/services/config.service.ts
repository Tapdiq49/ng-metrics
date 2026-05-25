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
    minHealthScore: undefined
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
            return this.mergeWithDefaults(userConfig);
          }
        } catch (error) {
          console.warn(`Warning: Could not parse config file ${filePath}, using defaults`);
        }
      }
    }
    return { ...this.defaultConfig };
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
