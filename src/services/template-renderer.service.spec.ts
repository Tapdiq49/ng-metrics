import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { TemplateRendererService } from './template-renderer.service';
import type { UnifiedReport } from '../types';

vi.mock('fs');

describe('TemplateRendererService', () => {
  let service: TemplateRendererService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new TemplateRendererService();
    vi.clearAllMocks();
  });

  it('should render report template with all data sections', () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Project is in good health',
      dependencies: [
        { name: '@angular/core', version: '17.0.0', status: 'up-to-date' }
      ],
      codeIssues: [
        {
          file: 'app.component.ts',
          issues: [
            {
              type: 'anti_pattern',
              message: 'Missing OnPush',
              line: 5,
              suggestion: 'Use ChangeDetectionStrategy.OnPush'
            }
          ]
        }
      ],
      fixes: {
        autoFixable: [
          { issue: 'Missing import', suggestion: 'Add import', priority: 'high' }
        ],
        manualReviewRequired: []
      },
      migrationPlan: [
        {
          step: 1,
          title: 'Update Angular',
          description: 'Update to latest version',
          priority: 'high'
        }
      ]
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);

    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      '{{score}} {{level}} {{levelColor}} {{summary}} {{generatedAt}} {{dependenciesSection}} {{codeIssuesSection}} {{fixesSection}} {{migrationSection}}'
    );

    // ACT
    const result = service.renderReportTemplate(mockReport);

    // ASSERT
    expect(result).toContain('85');
    expect(result).toContain('good');
    expect(result).toContain('#3b82f6');
    expect(result).toContain('Project is in good health');
    expect(result).toContain('@angular/core');
    expect(result).toContain('Missing OnPush');
    expect(result).toContain('Missing import');
    expect(result).toContain('Update Angular');
  });

  it('should throw error when template file is not found', () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    // ACT + ASSERT
    expect(() => service.renderReportTemplate(mockReport)).toThrow();
  });

  it('should render empty dependencies section when no dependencies', () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{{dependenciesSection}}');

    // ACT
    const result = service.renderReportTemplate(mockReport);

    // ASSERT
    expect(result).not.toContain('Detected Dependencies');
  });

  it('should render empty code issues section when no issues', () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{{codeIssuesSection}}');

    // ACT
    const result = service.renderReportTemplate(mockReport);

    // ASSERT
    expect(result).not.toContain('Code Issues');
  });

  it('should render empty fixes section when no fixes', () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{{fixesSection}}');

    // ACT
    const result = service.renderReportTemplate(mockReport);

    // ASSERT
    expect(result).not.toContain('Fix Suggestions');
  });

  it('should render empty migration section when no migration plan', () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{{migrationSection}}');

    // ACT
    const result = service.renderReportTemplate(mockReport);

    // ASSERT
    expect(result).not.toContain('Migration Plan');
  });
});