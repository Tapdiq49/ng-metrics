import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import { TemplateRendererService } from './template-renderer.service';
import type { UnifiedReport } from '../types';

vi.mock('fs/promises');

describe('TemplateRendererService', () => {
  let service: TemplateRendererService;

  beforeEach(() => {
    // ARRANGE (setup)
    service = new TemplateRendererService();
    vi.clearAllMocks();
  });

  it('should render report template with all data sections', async () => {
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

    vi.spyOn(fs, 'readFile').mockResolvedValue(
      '{{projectHealth.score}} {{projectHealth.level}} {{levelColor projectHealth.level}} {{summary}} {{#each dependencies}}{{name}}{{/each}} {{#each codeIssues}}{{#each issues}}{{message}}{{/each}}{{/each}} {{#each fixes.autoFixable}}{{issue}}{{/each}} {{#each migrationPlan}}{{title}}{{/each}}'
    );

    // ACT
    const result = await service.renderReportTemplate(mockReport);

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

  it('should throw error when template file read fails', async () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

    // ACT + ASSERT
    await expect(service.renderReportTemplate(mockReport)).rejects.toThrow();
  });

  it('should not render empty sections when data is empty', async () => {
    // ARRANGE
    const mockReport: UnifiedReport = {
      projectHealth: { score: 85, level: 'good' },
      summary: 'Test',
      dependencies: [],
      codeIssues: [],
      fixes: { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: []
    };

    vi.spyOn(fs, 'readFile').mockResolvedValue(
      '{{#if dependencies.length}}Dependencies{{/if}} {{#if codeIssues.length}}Issues{{/if}} {{#if hasFixes}}Fixes{{/if}} {{#if migrationPlan.length}}Migration{{/if}}'
    );

    // ACT
    const result = await service.renderReportTemplate(mockReport);

    // ASSERT
    expect(result).not.toContain('Dependencies');
    expect(result).not.toContain('Issues');
    expect(result).not.toContain('Fixes');
    expect(result).not.toContain('Migration');
  });
});