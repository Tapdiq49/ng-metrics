import * as fs from 'fs';
import * as path from 'path';

export interface PackageMetadata {
  name: string;
  version?: string;
  status?: string;
  recommendation?: string;
}

export interface ScanResult {
  metadata: {
    angularVersion?: string;
    isAngular21Plus: boolean;
  };
  packages: PackageMetadata[];
}

export class PackageScannerService {
  private static readonly ANGULAR_PACKAGE_PATTERNS = [
    /^@angular\/.*/,
    /^@ngrx\/.*/,
    /^rxjs$/,
    /^@angular\/material$/,
    /^@angular\/cdk$/
  ];

  /**
   * Scans the project's package.json to identify relevant Angular/RxJS dependencies
   * and detect deprecated or risky packages (like tslint, codelyzer, or zone.js).
   * 
   * @param projectPath The root directory path of the project to scan.
   * @returns Metadata about Angular version compatibility and detected packages.
   */
  public scan(projectPath: string = process.cwd()): ScanResult {
    // Resolve project path robustly to support absolute paths on all OS environments
    const packageJsonPath = path.resolve(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found in current directory');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    // Combine both runtime dependencies and development dependencies
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const packages: PackageMetadata[] = [];

    for (const [name, version] of Object.entries(allDependencies)) {
      if (this.isAngularPackage(name)) {
        const metadata: PackageMetadata = { name, version: version as string };
        
        // Define statuses and recommendations for legacy/risky packages
        if (name === 'zone.js') {
          metadata.status = 'legacy / optional (Angular 21 zoneless architecture support)';
          metadata.recommendation = 'Consider removing for Angular 21+ zoneless projects';
        } else if (name === 'tslint') {
          metadata.status = 'deprecated / risky';
          metadata.recommendation = 'Migrate to ESLint using ng add @angular-eslint/schematics';
        } else if (name === 'codelyzer') {
          metadata.status = 'deprecated / risky';
          metadata.recommendation = 'Remove codelyzer (deprecated, use ESLint instead)';
        }
        
        packages.push(metadata);
      }
    }

    // Determine the main Angular core version to evaluate compatibility
    const angularCorePackage = packages.find(p => p.name === '@angular/core');
    let angularVersion: string | undefined;
    let isAngular21Plus = false;

    if (angularCorePackage?.version) {
      // Strip semver range characters (^, ~) to parse the clean version string
      angularVersion = angularCorePackage.version.replace(/[\^~]/, '');
      const majorVersion = parseInt(angularVersion.split('.')[0], 10);
      isAngular21Plus = majorVersion >= 21;
    }

    return {
      metadata: {
        angularVersion,
        isAngular21Plus
      },
      packages
    };
  }

  /**
   * Evaluates if a given package name is related to Angular, RxJS,
   * or represents a deprecated/risky package we want to monitor.
   */
  private isAngularPackage(name: string): boolean {
    return PackageScannerService.ANGULAR_PACKAGE_PATTERNS.some((pattern: RegExp) => pattern.test(name)) || 
      name === 'zone.js' || 
      name === 'tslint' || 
      name === 'codelyzer';
  }
}
