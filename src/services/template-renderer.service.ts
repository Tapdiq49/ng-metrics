import * as fs from 'fs';
import * as path from 'path';
import type { 
  UnifiedReport, 
  PackageMetadata, 
  FileAnalysisResult, 
  CodeIssue, 
  GroupedSuggestions, 
  FixSuggestion, 
  MigrationStep 
} from '../types';

type HealthLevel = 'excellent' | 'good' | 'warning' | 'critical';
type IssueType = 'deprecated_api' | 'anti_pattern' | 'rxjs_issue' | 'security_issue';
type PriorityLevel = 'high' | 'medium' | 'low';

export class TemplateRendererService {
  private static readonly TEMPLATES_DIR = path.join(__dirname, '../templates');

  private static readonly LEVEL_COLORS: Record<HealthLevel, string> = {
    excellent: '#10b981',
    good: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444'
  };

  private static readonly TYPE_COLORS: Record<IssueType, string> = {
    deprecated_api: '#ef4444',
    anti_pattern: '#f59e0b',
    rxjs_issue: '#a855f7',
    security_issue: '#dc2626'
  };

  private static readonly PRIORITY_COLORS: Record<PriorityLevel, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6'
  };

  /**
   * Renders an HTML template with the provided data.
   * Loads the template file and replaces {{placeholders}} with corresponding data.
   */
  public renderReportTemplate(data: UnifiedReport): string {
    const templatePath = path.join(TemplateRendererService.TEMPLATES_DIR, 'report.template.html');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    let template = fs.readFileSync(templatePath, 'utf8');

    // Render top-level placeholders
    const level = data.projectHealth.level as HealthLevel;
    template = this.replacePlaceholder(template, 'score', data.projectHealth.score);
    template = this.replacePlaceholder(template, 'level', level);
    template = this.replacePlaceholder(template, 'levelColor', TemplateRendererService.LEVEL_COLORS[level] || '#3b82f6');
    template = this.replacePlaceholder(template, 'summary', data.summary);
    template = this.replacePlaceholder(template, 'generatedAt', new Date().toLocaleString());

    // Render sections
    template = this.renderDependenciesSection(template, data.dependencies);
    template = this.renderCodeIssuesSection(template, data.codeIssues);
    template = this.renderFixesSection(template, data.fixes);
    template = this.renderMigrationSection(template, data.migrationPlan);

    return template;
  }

  /**
   * Replaces a single {{placeholder}} in the template with the given value.
   */
  private replacePlaceholder(template: string, key: string, value: string | number): string {
    const regex = new RegExp(`{{${key}}}`, 'g');
    return template.replace(regex, String(value));
  }

  /**
   * Renders the dependencies section of the template.
   */
  private renderDependenciesSection(template: string, dependencies: PackageMetadata[]): string {
    if (dependencies.length === 0) {
      return this.replacePlaceholder(template, 'dependenciesSection', '');
    }

    const dependenciesHtml = dependencies
      .map((dep: PackageMetadata) => `
        <div class="card">
          <div class="card-title">${this.escapeHtml(dep.name)}</div>
          <div class="card-version">${this.escapeHtml(dep.version || 'unknown')}</div>
          ${dep.status ? `<div class="card-status">⚠ ${this.escapeHtml(dep.status)}</div>` : ''}
        </div>
      `)
      .join('');

    const sectionHtml = `
      <div class="section">
        <h2 class="section-title">Detected Dependencies</h2>
        <div class="card-grid">
          ${dependenciesHtml}
        </div>
      </div>
    `;

    return this.replacePlaceholder(template, 'dependenciesSection', sectionHtml);
  }

  /**
   * Renders the code issues section of the template.
   */
  private renderCodeIssuesSection(template: string, codeIssues: FileAnalysisResult[]): string {
    if (codeIssues.length === 0) {
      return this.replacePlaceholder(template, 'codeIssuesSection', '');
    }

    const issuesHtml = codeIssues
      .map((fileResult: FileAnalysisResult) => {
        const fileIssuesHtml = fileResult.issues
          .map((issue: CodeIssue) => {
            const type = issue.type as IssueType;
            return `
              <div class="issue-item" style="border-left-color: ${TemplateRendererService.TYPE_COLORS[type] || '#3b82f6'}">
                <span class="issue-type" style="background: ${TemplateRendererService.TYPE_COLORS[type] || '#3b82f6'}">${this.escapeHtml(issue.type)}</span>
                <div class="issue-message">${this.escapeHtml(issue.message)}</div>
                ${issue.line ? `<div class="issue-line">Line ${issue.line}</div>` : ''}
                ${issue.suggestion ? `<div class="issue-suggestion">💡 ${this.escapeHtml(issue.suggestion)}</div>` : ''}
              </div>
            `;
          })
          .join('');

        return `
          <div class="file-section">
            <div class="file-header">📁 ${this.escapeHtml(fileResult.file)}</div>
            ${fileIssuesHtml}
          </div>
        `;
      })
      .join('');

    const sectionHtml = `
      <div class="section">
        <h2 class="section-title">Code Issues</h2>
        ${issuesHtml}
      </div>
    `;

    return this.replacePlaceholder(template, 'codeIssuesSection', sectionHtml);
  }

  /**
   * Renders the fixes section of the template.
   */
  private renderFixesSection(template: string, fixes: GroupedSuggestions): string {
    const hasFixes = fixes.autoFixable.length > 0 || fixes.manualReviewRequired.length > 0;
    
    if (!hasFixes) {
      return this.replacePlaceholder(template, 'fixesSection', '');
    }

    let fixesHtml = '';

    if (fixes.autoFixable.length > 0) {
      fixesHtml += `
        <div class="fix-section">
          <div class="fix-header">✓ Auto-fixable</div>
          ${fixes.autoFixable.map((fix: FixSuggestion, i: number) => {
            const priority = fix.priority as PriorityLevel;
            return `
              <div class="fix-item">
                <span class="fix-priority" style="background: ${TemplateRendererService.PRIORITY_COLORS[priority] || '#3b82f6'}">${this.escapeHtml(fix.priority)}</span>
                <div class="fix-issue">${i + 1}. ${this.escapeHtml(fix.issue)}</div>
                <div class="fix-suggestion">${this.escapeHtml(fix.suggestion)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (fixes.manualReviewRequired.length > 0) {
      fixesHtml += `
        <div class="fix-section">
          <div class="fix-header">⚠ Manual review required</div>
          ${fixes.manualReviewRequired.map((fix: FixSuggestion, i: number) => {
            const priority = fix.priority as PriorityLevel;
            return `
              <div class="fix-item">
                <span class="fix-priority" style="background: ${TemplateRendererService.PRIORITY_COLORS[priority] || '#3b82f6'}">${this.escapeHtml(fix.priority)}</span>
                <div class="fix-issue">${i + 1}. ${this.escapeHtml(fix.issue)}</div>
                <div class="fix-suggestion">${this.escapeHtml(fix.suggestion)}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const sectionHtml = `
      <div class="section">
        <h2 class="section-title">Fix Suggestions</h2>
        ${fixesHtml}
      </div>
    `;

    return this.replacePlaceholder(template, 'fixesSection', sectionHtml);
  }

  /**
   * Renders the migration plan section of the template.
   */
  private renderMigrationSection(template: string, migrationPlan: MigrationStep[]): string {
    if (migrationPlan.length === 0) {
      return this.replacePlaceholder(template, 'migrationSection', '');
    }

    const migrationHtml = migrationPlan
      .map((step: MigrationStep) => `
        <div class="migration-step">
          <div class="step-number">${step.step}</div>
          <div class="step-content">
            <div class="step-title">${this.escapeHtml(step.title)}</div>
            <div class="step-desc">${this.escapeHtml(step.description)}</div>
          </div>
        </div>
      `)
      .join('');

    const sectionHtml = `
      <div class="section">
        <h2 class="section-title">Migration Plan</h2>
        ${migrationHtml}
      </div>
    `;

    return this.replacePlaceholder(template, 'migrationSection', sectionHtml);
  }

  /**
   * Escapes HTML special characters to prevent XSS vulnerabilities.
   * Works in Node.js environment.
   */
  private escapeHtml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
