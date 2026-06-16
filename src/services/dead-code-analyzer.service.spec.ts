import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DeadCodeAnalyzerService } from './dead-code-analyzer.service';

describe('DeadCodeAnalyzerService', () => {
  let service: DeadCodeAnalyzerService;
  let tempDir: string;
  let srcDir: string;

  beforeEach(() => {
    service = new DeadCodeAnalyzerService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ng-metrics-test-'));
    srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return empty if src dir does not exist', () => {
    // ACT
    const results = service.analyze(tempDir, 'non-existent');
    
    // ASSERT
    expect(results.length).toBe(0);
  });

  it('should detect a dead component (not used in HTML or routing)', () => {
    // ARRANGE
    // Create an unused component
    const compContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-unused',
        template: '<p>Unused</p>'
      })
      export class UnusedComponent { }
    `;
    fs.writeFileSync(path.join(srcDir, 'unused.component.ts'), compContent);

    // Create an empty HTML file
    fs.writeFileSync(path.join(srcDir, 'app.component.html'), '<div></div>');

    // ACT
    const results = service.analyze(tempDir, 'src');

    // ASSERT
    expect(results.length).toBe(1);
    expect(results[0].file).toContain('unused.component.ts');
    expect(results[0].issues.length).toBe(1);
    expect(results[0].issues[0].message).toContain("Dead Code Detected: Component 'UnusedComponent'");
  });

  it('should NOT detect a component as dead if used in HTML', () => {
    // ARRANGE
    const compContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-used',
        template: '<p>Used</p>'
      })
      export class UsedComponent { }
    `;
    fs.writeFileSync(path.join(srcDir, 'used.component.ts'), compContent);

    // Create an HTML file that uses the selector
    fs.writeFileSync(path.join(srcDir, 'app.component.html'), '<div><app-used></app-used></div>');

    // ACT
    const results = service.analyze(tempDir, 'src');

    // ASSERT
    expect(results.length).toBe(0);
  });

  it('should NOT detect a component as dead if used in routing', () => {
    // ARRANGE
    const compContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-routed',
        template: '<p>Routed</p>'
      })
      export class RoutedComponent { }
    `;
    fs.writeFileSync(path.join(srcDir, 'routed.component.ts'), compContent);

    // Create a routing module
    const routingContent = `
      import { Routes } from '@angular/router';
      import { RoutedComponent } from './routed.component';

      export const routes: Routes = [
        { path: 'routed', component: RoutedComponent }
      ];
    `;
    fs.writeFileSync(path.join(srcDir, 'app.routes.ts'), routingContent);

    // ACT
    const results = service.analyze(tempDir, 'src');

    // ASSERT
    expect(results.length).toBe(0);
  });
});
