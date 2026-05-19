import * as fs from 'fs';
import * as path from 'path';

export interface CodeIssue {
  type: 'deprecated_api' | 'anti_pattern' | 'rxjs_issue';
  message: string;
  line?: number;
}

export interface FileAnalysisResult {
  file: string;
  issues: CodeIssue[];
}

export class CodeAnalysisService {
  public analyze(projectPath: string = process.cwd(), customSrcDir?: string): FileAnalysisResult[] {
    const results: FileAnalysisResult[] = [];
    // Resolve srcDir using path.resolve so that both relative (e.g. 'src-test') and 
    // absolute paths (e.g. 'C:\repos\ERUSUM\app-frontend\src') are correctly supported.
    const srcDir = customSrcDir ? path.resolve(projectPath, customSrcDir) : path.resolve(projectPath, 'src');

    if (!fs.existsSync(srcDir)) {
      return results;
    }

    const files = this.scanDirectory(srcDir);

    for (const file of files) {
      const issues = this.analyzeFile(file);
      if (issues.length > 0) {
        results.push({ file, issues });
      }
    }

    return results;
  }

  private scanDirectory(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.scanDirectory(fullPath));
      } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private analyzeFile(filePath: string): CodeIssue[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues: CodeIssue[] = [];
    const lines = content.split('\n');

    if (filePath.endsWith('.ts')) {
      issues.push(...this.analyzeTypeScript(lines));
    } else if (filePath.endsWith('.html')) {
      issues.push(...this.analyzeTemplate(lines));
    }

    return issues;
  }

  private analyzeTypeScript(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const content = lines.join('\n');

    // Check Component ChangeDetectionStrategy.OnPush
    if (content.includes('@Component') && !content.includes('ChangeDetectionStrategy.OnPush')) {
      const compIndex = lines.findIndex(l => l.includes('@Component'));
      issues.push({
        type: 'anti_pattern',
        message: 'Component is missing ChangeDetectionStrategy.OnPush. Consider adding it for optimized performance',
        line: compIndex !== -1 ? compIndex + 1 : undefined
      });
    }

    // Check RxJS Subscription Memory Leak
    const hasSubscribe = content.includes('.subscribe(');
    const hasUnsubscribe = content.includes('.unsubscribe()') || content.includes('takeUntil') || content.includes('first(') || content.includes('take(1)');
    if (hasSubscribe && !hasUnsubscribe) {
      const subIndex = lines.findIndex(l => l.includes('.subscribe('));
      issues.push({
        type: 'rxjs_issue',
        message: 'Potential memory leak: active subscription found without takeUntil, take(1), first(), or unsubscribe()',
        line: subIndex !== -1 ? subIndex + 1 : undefined
      });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (line.includes('.toPromise()')) {
        issues.push({
          type: 'deprecated_api',
          message: 'toPromise() is deprecated - use firstValueFrom or lastValueFrom from rxjs',
          line: lineNumber
        });
      }

      if (line.includes('HttpModule')) {
        issues.push({
          type: 'deprecated_api',
          message: 'HttpModule is deprecated - use HttpClientModule instead',
          line: lineNumber
        });
      }

      if (line.includes('@ViewChild') && line.includes('static:')) {
        issues.push({
          type: 'deprecated_api',
          message: '@ViewChild static:true is deprecated',
          line: lineNumber
        });
      }

      // Direct reference to window or document
      if (/\bwindow\.[a-zA-Z]/.test(line) || /\bdocument\.[a-zA-Z]/.test(line)) {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct reference to window or document detected. Inject DOCUMENT token instead for SSR compatibility',
          line: lineNumber
        });
      }

      // Direct DOM manipulation via nativeElement
      if (line.includes('.nativeElement.')) {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct DOM manipulation via nativeElement detected. Use Renderer2 instead',
          line: lineNumber
        });
      }
    }

    issues.push(...this.detectNestedSubscriptions(lines));

    return issues;
  }

  private detectNestedSubscriptions(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];
    let subscriptionDepth = 0;
    let inSubscription = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (line.includes('.subscribe(')) {
        if (inSubscription) {
          issues.push({
            type: 'rxjs_issue',
            message: 'Nested subscriptions detected - consider using higher-order operators (switchMap, mergeMap, etc.)',
            line: lineNumber
          });
        }
        subscriptionDepth++;
        inSubscription = true;
      }

      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      subscriptionDepth -= (closeParens - openParens);

      if (subscriptionDepth <= 0) {
        inSubscription = false;
      }
    }

    return issues;
  }

  private analyzeTemplate(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (line.includes('*ngIf') || line.includes('*ngFor')) {
        issues.push({
          type: 'anti_pattern',
          message: 'Legacy structural directive syntax detected - consider migrating to Angular 17+ control flow (@if, @for)',
          line: lineNumber
        });
      }

      if (line.includes('*ngFor') && !line.includes('trackBy')) {
        issues.push({
          type: 'anti_pattern',
          message: '*ngFor directive is missing trackBy. Consider adding trackBy to improve list rendering performance',
          line: lineNumber
        });
      }

      if (line.includes('@for') && (line.includes('track $index') || line.includes('track index'))) {
        issues.push({
          type: 'anti_pattern',
          message: 'Discouraged @for tracking by index. Track by unique identifier instead if items can mutate',
          line: lineNumber
        });
      }
    }

    return issues;
  }
}
