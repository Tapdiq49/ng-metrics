import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as fs from 'fs';
import { CodeAnalysisService } from './code-analysis.service';

vi.mock('fs');
vi.mock('./dead-code-analyzer.service', () => {
  return {
    DeadCodeAnalyzerService: class {
      analyze() { return []; }
    }
  };
});

const mockExistsSync = fs.existsSync as Mock;
const mockReaddirSync = fs.readdirSync as Mock;
const mockStatSync = fs.statSync as Mock;
const mockReadFileSync = fs.readFileSync as Mock;

describe('CodeAnalysisService', () => {
  let service: CodeAnalysisService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new CodeAnalysisService();
    vi.clearAllMocks();
  });

  it('should detect OnPush missing and direct window references in TS files', () => {
    // ARRANGE
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['component.ts']);
    mockStatSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as fs.Stats);

    const tsContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-test',
        template: ''
      })
      export class TestComponent {
        constructor() {
          console.log(window.location.href);
        }
      }
    `;

    mockReadFileSync.mockReturnValue(tsContent);

    // ACT
    const results = service.analyze();

    // ASSERT
    expect(results.length).toBe(1);

    const issues = results[0].issues;

    const onPushIssue = issues.find(i =>
      i.message.includes('ChangeDetectionStrategy.OnPush')
    );

    expect(onPushIssue).toBeDefined();
    expect(onPushIssue?.type).toBe('anti_pattern');

    const windowIssue = issues.find(i =>
      i.message.includes('Direct reference to window or document')
    );

    expect(windowIssue).toBeDefined();
    expect(windowIssue?.type).toBe('anti_pattern');
  });

  it('should detect [innerHTML] and structural directives in HTML files', () => {
    // ARRANGE
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['template.html']);
    mockStatSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as fs.Stats);

    const htmlContent = `
      <div *ngIf="show">
        <span [innerHTML]="dangerousContent"></span>
      </div>
    `;

    mockReadFileSync.mockReturnValue(htmlContent);

    // ACT
    const results = service.analyze();

    // ASSERT
    expect(results.length).toBe(1);

    const issues = results[0].issues;

    const ngIfIssue = issues.find(i =>
      i.message.includes('Legacy structural directive syntax')
    );

    expect(ngIfIssue).toBeDefined();

    const innerHtmlIssue = issues.find(i =>
      i.message.includes('[innerHTML] binding detected')
    );

    expect(innerHtmlIssue).toBeDefined();
    expect(innerHtmlIssue?.type).toBe('security_issue');
  });
});