import * as fs from 'fs';
import * as path from 'path';

export interface CodeIssue {
  type: 'deprecated_api' | 'anti_pattern' | 'rxjs_issue' | 'security_issue';
  message: string;
  line?: number;
  suggestion?: string;
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
        line: compIndex !== -1 ? compIndex + 1 : undefined,
        suggestion: "Add 'changeDetection: ChangeDetectionStrategy.OnPush' inside the @Component decorator options."
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
        line: subIndex !== -1 ? subIndex + 1 : undefined,
        suggestion: "Clean up the subscription using the 'takeUntil' operator with a destroy subject, or store it and call '.unsubscribe()' in ngOnDestroy()."
      });
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (line.includes('.toPromise()')) {
        issues.push({
          type: 'deprecated_api',
          message: 'toPromise() is deprecated - use firstValueFrom or lastValueFrom from rxjs',
          line: lineNumber,
          suggestion: "Change '.toPromise()' to 'firstValueFrom(observable)' (import from 'rxjs')."
        });
      }

      if (line.includes('HttpModule')) {
        issues.push({
          type: 'deprecated_api',
          message: 'HttpModule is deprecated - use HttpClientModule instead',
          line: lineNumber,
          suggestion: "Replace 'HttpModule' imports with 'HttpClientModule'."
        });
      }

      if (line.includes('@ViewChild') && line.includes('static:')) {
        issues.push({
          type: 'deprecated_api',
          message: '@ViewChild static:true is deprecated',
          line: lineNumber,
          suggestion: "Remove the '{ static: true }' or '{ static: false }' option parameter entirely."
        });
      }

      // Direct reference to window or document
      if (/\bwindow\.[a-zA-Z]/.test(line) || /\bdocument\.[a-zA-Z]/.test(line)) {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct reference to window or document detected. Inject DOCUMENT token instead for SSR compatibility',
          line: lineNumber,
          suggestion: "Inject the DOCUMENT token in the constructor: constructor(@Inject(DOCUMENT) private document: Document) (import DOCUMENT from '@angular/common')."
        });
      }

      // Direct DOM manipulation via nativeElement
      if (line.includes('.nativeElement.')) {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct DOM manipulation via nativeElement detected. Use Renderer2 instead',
          line: lineNumber,
          suggestion: "Inject 'Renderer2' and use its methods (e.g. renderer.setStyle, renderer.setAttribute) instead of direct nativeElement mutation."
        });
      }

      // DOM Sanitizer bypass checks (XSS Security risk)
      if (line.includes('bypassSecurityTrust')) {
        issues.push({
          type: 'security_issue',
          message: 'Bypassing Angular DOM Sanitizer (bypassSecurityTrustXXX) detected. Bypassing security checks can introduce critical XSS vulnerabilities',
          line: lineNumber,
          suggestion: "Ensure input data is heavily sanitized using a library like DOMPurify before displaying it, or avoid bypassing security trust."
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
            line: lineNumber,
            suggestion: "Use higher-order mapping operators like 'switchMap', 'mergeMap', or 'concatMap' to chain observable requests cleanly."
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
          line: lineNumber,
          suggestion: "Run Angular migration tool: 'ng g @angular/core:control-flow' to automatically migrate to @if/@for syntax."
        });
      }

      if (line.includes('*ngFor') && !line.includes('trackBy')) {
        issues.push({
          type: 'anti_pattern',
          message: '*ngFor directive is missing trackBy. Consider adding trackBy to improve list rendering performance',
          line: lineNumber,
          suggestion: "Add a 'trackBy: trackById' function to the *ngFor loop to track items by a unique identifier."
        });
      }

      if (line.includes('@for') && (line.includes('track $index') || line.includes('track index'))) {
        issues.push({
          type: 'anti_pattern',
          message: 'Discouraged @for tracking by index. Track by unique identifier instead if items can mutate',
          line: lineNumber,
          suggestion: "Change 'track $index' to track a unique field of the item (e.g. 'track item.id') to optimize rendering."
        });
      }

      if (line.includes('[innerHTML]')) {
        issues.push({
          type: 'security_issue',
          message: '[innerHTML] binding detected. This can lead to XSS vulnerabilities if the bound content is not properly sanitized',
          line: lineNumber,
          suggestion: "Ensure the data bound to [innerHTML] is sanitized using DOMPurify, or avoid [innerHTML] entirely if you only need text interpolation ({{ value }})."
        });
      }
    }

    return issues;
  }
}
