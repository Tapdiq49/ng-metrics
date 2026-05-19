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

  public scan(projectPath: string = process.cwd()): ScanResult {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found in current directory');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const packages: PackageMetadata[] = [];

    for (const [name, version] of Object.entries(allDependencies)) {
      if (this.isAngularPackage(name)) {
        const metadata: PackageMetadata = { name, version: version as string };
        
        if (name === 'zone.js') {
          metadata.status = 'legacy / optional (Angular 21 zoneless architecture support)';
          metadata.recommendation = 'Consider removing for Angular 21+ zoneless projects';
        }
        
        packages.push(metadata);
      }
    }

    const angularCorePackage = packages.find(p => p.name === '@angular/core');
    let angularVersion: string | undefined;
    let isAngular21Plus = false;

    if (angularCorePackage?.version) {
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

  private isAngularPackage(name: string): boolean {
    return PackageScannerService.ANGULAR_PACKAGE_PATTERNS.some((pattern: RegExp) => pattern.test(name)) || name === 'zone.js';
  }
}
