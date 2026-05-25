import * as fs from 'fs';
import * as path from 'path';

export interface TemplateData {
  [key: string]: string | number | boolean | object | undefined;
}

export class TemplateRendererService {
  private static readonly TEMPLATES_DIR = path.join(__dirname, '../templates');

  /**
   * Renders an HTML template with the provided data.
   * Loads the template file and replaces {{placeholders}} with corresponding data.
   */
  public renderReportTemplate(data: any): string {
    const templatePath = path.join(TemplateRendererService.TEMPLATES_DIR, 'report.template.html');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    let template = fs.readFileSync(templatePath, 'utf8');

    const levelColors: Record<string, string> = {
      excellent: '#10b981',
      good: '#3b82f6',
      warning: '#f59e0b',
      critical: '#ef4444'
    };

    const typeColors: Record<string, string> = {
      deprecated_api: '#ef4444',
      anti_pattern: '#f59e0b',
      rxjs_issue: '#a855f7',
      security_issue: '#dc2626'
    };

    const priorityColors: Record<string, string> = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#3b82f6'
    };

    // Render top-level placeholders
    template = this.replacePlaceholder(template, 'score', data.projectHealth.score);
    template = this.replacePlaceholder(template, 'level', data.projectHealth.level);
    template = this.replacePlaceholder(template, 'levelColor', levelColors[data.projectHealth.level] || '#3b82f6');
    template = this.replacePlaceholder(template, 'summary', data.summary);
    template = this.replacePlaceholder(template, 'generatedAt', new Date().toLocaleString());

    // Render dependencies section
    template = this.renderDependenciesSection(template, data.dependencies);

    // Render code issues section
    template = this.renderCodeIssuesSection(template, data.codeIssues, typeColors);

    // Render fixes section
    template = this.renderFixesSection(template, data.fixes, priorityColors);

    // Render migration section
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
  private renderDependenciesSection(template: string, dependencies: any[]): string {
    if (dependencies.length === 0) {
      return this.replacePlaceholder(template, 'dependenciesSection', '');
    }

    const dependenciesHtml = dependencies
      .map((dep: any) => `
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
  private renderCodeIssuesSection(template: string, codeIssues: any[], typeColors: Record<string, string>): string {
    if (codeIssues.length === 0) {
      return this.replacePlaceholder(template, 'codeIssuesSection', '');
    }

    const issuesHtml = codeIssues
      .map((fileResult: any) => {
        const fileIssuesHtml = fileResult.issues
          .map((issue: any) => `
            <div class="issue-item" style="border-left-color: ${typeColors[issue.type] || '#3b82f6'}">
              <span class="issue-type" style="background: ${typeColors[issue.type] || '#3b82f6'}">${this.escapeHtml(issue.type)}</span>
              <div class="issue-message">${this.escapeHtml(issue.message)}</div>
              ${issue.line ? `<div class="issue-line">Line ${issue.line}</div>` : ''}
              ${issue.suggestion ? `<div class="issue-suggestion">💡 ${this.escapeHtml(issue.suggestion)}</div>` : ''}
            </div>
          `)
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
  private renderFixesSection(template: string, fixes: any, priorityColors: Record<string, string>): string {
    const hasFixes = fixes.autoFixable.length > 0 || fixes.manualReviewRequired.length > 0;
    
    if (!hasFixes) {
      return this.replacePlaceholder(template, 'fixesSection', '');
    }

    let fixesHtml = '';

    if (fixes.autoFixable.length > 0) {
      fixesHtml += `
        <div class="fix-section">
          <div class="fix-header">✓ Auto-fixable</div>
          ${fixes.autoFixable.map((fix: any, i: number) => `
            <div class="fix-item">
              <span class="fix-priority" style="background: ${priorityColors[fix.priority] || '#3b82f6'}">${this.escapeHtml(fix.priority)}</span>
              <div class="fix-issue">${i + 1}. ${this.escapeHtml(fix.issue)}</div>
              <div class="fix-suggestion">${this.escapeHtml(fix.suggestion)}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (fixes.manualReviewRequired.length > 0) {
      fixesHtml += `
        <div class="fix-section">
          <div class="fix-header">⚠ Manual review required</div>
          ${fixes.manualReviewRequired.map((fix: any, i: number) => `
            <div class="fix-item">
              <span class="fix-priority" style="background: ${priorityColors[fix.priority] || '#3b82f6'}">${this.escapeHtml(fix.priority)}</span>
              <div class="fix-issue">${i + 1}. ${this.escapeHtml(fix.issue)}</div>
              <div class="fix-suggestion">${this.escapeHtml(fix.suggestion)}</div>
            </div>
          `).join('')}
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
  private renderMigrationSection(template: string, migrationPlan: any[]): string {
    if (migrationPlan.length === 0) {
      return this.replacePlaceholder(template, 'migrationSection', '');
    }

    const migrationHtml = migrationPlan
      .map((step: any) => `
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
