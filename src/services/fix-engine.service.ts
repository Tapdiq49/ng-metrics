import * as fs from 'fs';
import * as path from 'path';
import type { FixChange, FixResult, PackageJson } from '../types';

export class FixEngineService {
  private static readonly SAFE_TO_REMOVE = ['tslint', 'codelyzer'];

  /**
   * Climbs up the directory tree starting from startDir until it finds a directory
   * containing a package.json file. Falls back to process.cwd() if none is found.
   */
  private findProjectRoot(startDir: string): string {
    let currentDir = path.resolve(startDir);
    
    try {
      if (fs.existsSync(currentDir) && fs.statSync(currentDir).isFile()) {
        currentDir = path.dirname(currentDir);
      }
    } catch (e) {
      // Ignore
    }

    while (true) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
    return process.cwd();
  }

  /**
   * Recursively scans a directory and lists all TypeScript (.ts) files.
   */
  private scanDirectory(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.scanDirectory(fullPath));
      } else if (fullPath.endsWith('.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Evaluates and applies (if dryRun is false) fixes to package.json and source code files.
   */
  public apply(projectPath: string = process.cwd(), customSrcDir?: string, dryRun: boolean = true): FixResult {
    let resolvedProjectPath = projectPath;
    if (customSrcDir) {
      const absoluteSrcDir = path.resolve(projectPath, customSrcDir);
      resolvedProjectPath = this.findProjectRoot(absoluteSrcDir);
    }

    const packageJsonPath = path.join(resolvedProjectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
    const changes: FixChange[] = [];

    // 1. Fix package.json dependencies
    changes.push(...this.removeUnsafePackages(packageJson));

    if (!dryRun && changes.length > 0) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    // 2. Fix source code files (e.g. ViewChild static, toPromise)
    const srcDir = customSrcDir ? path.resolve(resolvedProjectPath, customSrcDir) : path.resolve(resolvedProjectPath, 'src');
    if (fs.existsSync(srcDir)) {
      const files = this.scanDirectory(srcDir);
      for (const file of files) {
        const fileContent = fs.readFileSync(file, 'utf8');
        const lines = fileContent.split('\n');
        let fileChanged = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          // Skip comment lines and regex/implementation lines in the tool itself
          if (
            trimmed.startsWith('//') || 
            trimmed.startsWith('*') || 
            trimmed.startsWith('/*') ||
            trimmed.includes('toPromiseRegex') ||
            trimmed.includes('viewChildRegex')
          ) {
            continue;
          }

          let modifiedLine = line;

          // Apply ViewChild static parameter removal
          // Matching: @ViewChild('name', { static: true }) or @ViewChild(Component, { static: false })
          const viewChildRegex = /@ViewChild\(([^,]+),\s*\{\s*static:\s*(?:true|false)\s*\}\)/g;
          if (viewChildRegex.test(modifiedLine)) {
            modifiedLine = modifiedLine.replace(viewChildRegex, '@ViewChild($1)');
            fileChanged = true;
          }

          // Apply toPromise() to firstValueFrom() conversion
          // Matching: someObservable.toPromise() -> firstValueFrom(someObservable)
          const toPromiseRegex = /([a-zA-Z0-9_$\.\(\)\'\"\/\[\]\-]+)\.toPromise\(\)/g;
          if (toPromiseRegex.test(modifiedLine)) {
            // Skip matching string literals of toPromise inside includes()
            if (
              !modifiedLine.includes("'.toPromise()'") &&
              !modifiedLine.includes('".toPromise()"') &&
              !modifiedLine.includes('includes(') &&
              !modifiedLine.includes('indexOf(')
            ) {
              modifiedLine = modifiedLine.replace(toPromiseRegex, 'firstValueFrom($1)');
              fileChanged = true;
            }
          }

          lines[i] = modifiedLine;
        }

        if (fileChanged) {
          let modifiedContent = lines.join('\n');

          // Ensure firstValueFrom is imported from 'rxjs'
          if (modifiedContent.includes('firstValueFrom') && !fileContent.includes('firstValueFrom')) {
            const rxjsImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]rxjs['"];/;
            if (rxjsImportRegex.test(modifiedContent)) {
              // Append to existing rxjs import
              modifiedContent = modifiedContent.replace(rxjsImportRegex, (match, imports) => {
                return `import { ${imports.trim()}, firstValueFrom } from 'rxjs';`;
              });
            } else {
              // Prepend a new import at the top of the file
              modifiedContent = `import { firstValueFrom } from 'rxjs';\n` + modifiedContent;
            }
          }

          const relativePath = path.relative(resolvedProjectPath, file);
          changes.push({
            type: 'code_fix',
            package: relativePath,
            before: 'Legacy syntax (ViewChild static or toPromise)',
            after: 'Updated modern syntax (firstValueFrom or static removed)'
          });

          if (!dryRun) {
            fs.writeFileSync(file, modifiedContent, 'utf8');
          }
        }
      }
    }

    return { applied: !dryRun, changes };
  }

  private removeUnsafePackages(packageJson: PackageJson): FixChange[] {
    const changes: FixChange[] = [];

    for (const depType of ['dependencies', 'devDependencies'] as const) {
      const dependencies = packageJson[depType];
      if (!dependencies) continue;

      for (const pkgName of FixEngineService.SAFE_TO_REMOVE) {
        if (dependencies[pkgName]) {
          changes.push({
            type: 'remove',
            package: pkgName,
            before: dependencies[pkgName],
            after: '(removed)'
          });
          delete dependencies[pkgName];
        }
      }
    }

    return changes;
  }
}
