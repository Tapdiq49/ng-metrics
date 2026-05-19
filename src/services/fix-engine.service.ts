import * as fs from 'fs';
import * as path from 'path';

export interface FixChange {
  type: string;
  package: string;
  before: string;
  after: string;
}

export interface FixResult {
  applied: boolean;
  changes: FixChange[];
}

export class FixEngineService {
  private static readonly SAFE_TO_REMOVE = ['tslint', 'codelyzer'];
  private static readonly UNSAFE_TO_UPGRADE = ['@angular/core', '@angular/common', '@angular/cli', 'rxjs'];

  public apply(projectPath: string = process.cwd(), dryRun: boolean = true): FixResult {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const originalJson = JSON.parse(JSON.stringify(packageJson));

    const changes: FixChange[] = [];

    changes.push(...this.removeUnsafePackages(packageJson));

    if (!dryRun) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    return { applied: !dryRun, changes };
  }

  private removeUnsafePackages(packageJson: any): FixChange[] {
    const changes: FixChange[] = [];

    for (const depType of ['dependencies', 'devDependencies']) {
      if (!packageJson[depType]) continue;

      for (const pkgName of FixEngineService.SAFE_TO_REMOVE) {
        if (packageJson[depType][pkgName]) {
          changes.push({
            type: 'remove',
            package: pkgName,
            before: packageJson[depType][pkgName],
            after: '(removed)'
          });
          delete packageJson[depType][pkgName];
        }
      }
    }

    return changes;
  }
}
