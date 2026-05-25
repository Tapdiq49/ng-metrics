import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { PackageScannerService } from './package-scanner.service';

vi.mock('fs');

describe('PackageScannerService', () => {
  let service: PackageScannerService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new PackageScannerService();
    vi.clearAllMocks();
  });

  it('should throw an error if package.json does not exist', () => {
    // ARRANGE
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    // ACT + ASSERT
    expect(() => service.scan()).toThrow(
      'package.json not found in current directory'
    );
  });

  it('should scan and identify Angular/RxJS packages', () => {
    // ARRANGE
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        dependencies: {
          '@angular/core': '^16.2.0',
          'rxjs': '^7.8.0',
          'zone.js': '^0.13.0'
        },
        devDependencies: {
          'tslint': '^6.1.3'
        }
      })
    );

    // ACT
    const result = service.scan();

    // ASSERT
    expect(result.metadata.angularVersion).toBe('16.2.0');
    expect(result.metadata.isAngular21Plus).toBe(false);

    expect(result.packages).toContainEqual({
      name: '@angular/core',
      version: '^16.2.0'
    });

    expect(result.packages).toContainEqual({
      name: 'tslint',
      version: '^6.1.3',
      status: 'deprecated / risky',
      recommendation: 'Migrate to ESLint using ng add @angular-eslint/schematics'
    });
  });

  it('should detect Angular 21+ properly', () => {
    // ARRANGE
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        dependencies: {
          '@angular/core': '^21.0.0-next.0'
        }
      })
    );

    // ACT
    const result = service.scan();

    // ASSERT
    expect(result.metadata.angularVersion).toBe('21.0.0-next.0');
    expect(result.metadata.isAngular21Plus).toBe(true);
  });
});