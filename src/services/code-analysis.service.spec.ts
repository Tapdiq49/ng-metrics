import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { CodeAnalysisService } from './code-analysis.service';

vi.mock('fs');

describe('CodeAnalysisService', () => {
  let service: CodeAnalysisService;

  beforeEach(() => {
    service = new CodeAnalysisService();
    vi.clearAllMocks();
  });

  it('should detect OnPush missing and direct window references in TS files', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Mock file scanner returning one file
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['component.ts'] as any);
    vi.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false
    } as any);

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
    vi.spyOn(fs, 'readFileSync').mockReturnValue(tsContent);

    const results = service.analyze();
    expect(results.length).toBe(1);
    const issues = results[0].issues;

    // Should find OnPush issue
    const onPushIssue = issues.find(i => i.message.includes('ChangeDetectionStrategy.OnPush'));
    expect(onPushIssue).toBeDefined();
    expect(onPushIssue?.type).toBe('anti_pattern');

    // Should find window reference
    const windowIssue = issues.find(i => i.message.includes('Direct reference to window or document'));
    expect(windowIssue).toBeDefined();
    expect(windowIssue?.type).toBe('anti_pattern');
  });

  it('should detect [innerHTML] and structural directives in HTML files', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['template.html'] as any);
    vi.spyOn(fs, 'statSync').mockReturnValue({
      isDirectory: () => false
    } as any);

    const htmlContent = `
<div *ngIf="show">
  <span [innerHTML]="dangerousContent"></span>
</div>
    `;
    vi.spyOn(fs, 'readFileSync').mockReturnValue(htmlContent);

    const results = service.analyze();
    expect(results.length).toBe(1);
    const issues = results[0].issues;

    // Legacy *ngIf
    const ngIfIssue = issues.find(i => i.message.includes('Legacy structural directive syntax'));
    expect(ngIfIssue).toBeDefined();

    // innerHTML risk
    const innerHtmlIssue = issues.find(i => i.message.includes('[innerHTML] binding detected'));
    expect(innerHtmlIssue).toBeDefined();
    expect(innerHtmlIssue?.type).toBe('security_issue');
  });
});
