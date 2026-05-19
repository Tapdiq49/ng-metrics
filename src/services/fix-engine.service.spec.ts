import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { FixEngineService } from './fix-engine.service';

vi.mock('fs');

describe('FixEngineService', () => {
  let service: FixEngineService;

  beforeEach(() => {
    service = new FixEngineService();
    vi.clearAllMocks();
  });

  it('should remove risky packages from package.json', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      return p.toString().endsWith('package.json');
    });
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      dependencies: {
        'tslint': '^6.1.3'
      }
    }));
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const result = service.apply(process.cwd(), undefined, false);
    expect(result.applied).toBe(true);
    expect(result.changes).toContainEqual({
      type: 'remove',
      package: 'tslint',
      before: '^6.1.3',
      after: '(removed)'
    });
    expect(writeSpy).toHaveBeenCalled();
  });

  it('should auto-fix ViewChild and toPromise in source files', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Mock package.json exists but has no risky packages
    vi.spyOn(fs, 'readFileSync').mockImplementation((path: any) => {
      if (path.toString().endsWith('package.json')) {
        return JSON.stringify({ dependencies: {} });
      }
      // Return dummy component TS content
      return `
import { Component, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';

@Component({ selector: 'test' })
export class Test {
  @ViewChild('myRef', { static: true }) ref: any;

  getData(obs: Observable<any>) {
    return obs.toPromise();
  }
}
      `;
    });

    vi.spyOn(fs, 'readdirSync').mockReturnValue(['component.ts'] as any);
    vi.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false
    } as any);

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const result = service.apply(process.cwd(), undefined, false);
    expect(result.changes.length).toBe(1);
    expect(result.changes[0].type).toBe('code_fix');

    // Verify it rewrote with the modified file
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('component.ts'),
      expect.stringContaining("@ViewChild('myRef')"),
      'utf8'
    );
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('component.ts'),
      expect.stringContaining('firstValueFrom(obs)'),
      'utf8'
    );
    expect(writeSpy).toHaveBeenCalledWith(
      expect.stringContaining('component.ts'),
      expect.stringContaining("import { Observable, firstValueFrom } from 'rxjs';"),
      'utf8'
    );
  });
});
