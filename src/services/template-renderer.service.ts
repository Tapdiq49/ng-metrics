import * as fs from 'fs/promises';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import type { UnifiedReport, HealthLevel, IssueType, PriorityLevel } from '../types';

export class TemplateRendererService {
  private static readonly TEMPLATES_DIR = path.join(__dirname, '../templates');
  private compiledTemplate: HandlebarsTemplateDelegate | null = null;
  private isHelpersRegistered = false;

  private static readonly LEVEL_COLORS: Record<HealthLevel, string> = {
    excellent: '#10b981',
    good: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444'
  };

  private static readonly TYPE_COLORS: Record<string, string> = {
    deprecated_api: '#ef4444',
    anti_pattern: '#f59e0b',
    rxjs_issue: '#a855f7',
    security_issue: '#dc2626'
  };

  private static readonly PRIORITY_COLORS: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  };

  /**
   * Renders an HTML template with the provided data asynchronously using Handlebars.
   * Compiles and caches the template on the first run.
   */
  public async renderReportTemplate(data: UnifiedReport): Promise<string> {
    if (!this.isHelpersRegistered) {
      this.registerHelpers();
      this.isHelpersRegistered = true;
    }

    if (!this.compiledTemplate) {
      const templatePath = path.join(TemplateRendererService.TEMPLATES_DIR, 'report.template.hbs');

      try {
        const templateStr = await fs.readFile(templatePath, 'utf8');
        this.compiledTemplate = Handlebars.compile(templateStr);
      } catch (error) {
        throw new Error(`Failed to read template file at: ${templatePath}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Defensive data formatting
    const templateData = {
      ...data,
      dependencies: data.dependencies ?? [],
      codeIssues: data.codeIssues ?? [],
      fixes: data.fixes ?? { autoFixable: [], manualReviewRequired: [] },
      migrationPlan: data.migrationPlan ?? [],
      hasFixes: (data.fixes?.autoFixable?.length ?? 0) > 0 || (data.fixes?.manualReviewRequired?.length ?? 0) > 0,
      generatedAt: new Date().toLocaleString()
    };

    return this.compiledTemplate(templateData);
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('levelColor', (level: string) => {
      return TemplateRendererService.LEVEL_COLORS[level as HealthLevel] || '#3b82f6';
    });

    Handlebars.registerHelper('typeColor', (type: string) => {
      return TemplateRendererService.TYPE_COLORS[type as IssueType] || '#3b82f6';
    });

    Handlebars.registerHelper('priorityColor', (priority: string) => {
      return TemplateRendererService.PRIORITY_COLORS[priority as PriorityLevel] || '#3b82f6';
    });

    Handlebars.registerHelper('inc', (value: string | number) => {
      return parseInt(value as string, 10) + 1;
    });
  }
}
