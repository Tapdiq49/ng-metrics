import * as fs from 'fs';
import * as path from 'path';
import type { CodeIssue, FileAnalysisResult, Config } from '../types';

export class CodeAnalysisService {
  private config: Config;

  constructor(config?: Config) {
    this.config = config || {
      rules: {
        viewChildStatic: true,
        toPromise: true,
        httpModule: true,
        changeDetectionOnPush: true,
        windowDocumentReference: true,
        nativeElementManipulation: true,
        rxjsMemoryLeak: true,
        nestedSubscriptions: true,
        legacyStructuralDirectives: true,
        ngForTrackBy: true,
        forTrackByIndex: true,
        innerHtmlBinding: true,
        bypassSecurityTrust: true
      }
    };
  }

  /**
   * Performs code analysis on all TypeScript (.ts) and HTML template files
   * in the specified source directory, looking for anti-patterns, deprecations, and security risks.
   * 
   * @param projectPath The root directory path of the project.
   * @param customSrcDir Optional custom sub-directory to scan instead of the default 'src'.
   * @returns An array containing the analysis results grouped by file.
   */
  public analyze(projectPath: string = process.cwd(), customSrcDir?: string): FileAnalysisResult[] {
    const results: FileAnalysisResult[] = [];
    const srcDir = customSrcDir ? path.resolve(projectPath, customSrcDir) : path.resolve(projectPath, this.config.srcDir || 'src');

    if (!fs.existsSync(srcDir)) {
      return results;
    }

    const files = this.scanDirectory(srcDir);

    for (const file of files) {
      if (this.shouldExcludeFile(file, projectPath)) {
        continue;
      }
      const issues = this.analyzeFile(file);
      if (issues.length > 0) {
        results.push({ file, issues });
      }
    }

    return results;
  }

  private shouldExcludeFile(filePath: string, projectPath: string): boolean {
    if (!this.config.exclude || this.config.exclude.length === 0) {
      return false;
    }
    const relativePath = path.relative(projectPath, filePath);
    return this.config.exclude.some(excludePattern => {
      if (excludePattern.endsWith('/')) {
        return relativePath.startsWith(excludePattern);
      }
      return relativePath.includes(excludePattern);
    });
  }

  /**
   * Recursively scans a directory to find all TypeScript (.ts) and HTML (.html) files.
   * 
   * @param dir The directory path to scan.
   * @returns An array of absolute file paths matching the extensions.
   */
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

  /**
   * Triggers the appropriate scanner (TypeScript or Template) based on the file type.
   * 
   * @param filePath The absolute path of the file to analyze.
   * @returns An array of detected code issues.
   */
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

  /**
   * Scans a TypeScript file line-by-line to check for component strategies,
   * deprecations, RxJS memory leaks, and DOM sanitizer bypasses.
   * 
   * @param lines An array of lines representing the TypeScript file contents.
   * @returns An array of detected code issues.
   */
  private analyzeTypeScript(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const content = lines.join('\n');

    // Check Component ChangeDetectionStrategy.OnPush
    if (this.config.rules?.changeDetectionOnPush && content.includes('@Component') && !content.includes('ChangeDetectionStrategy.OnPush')) {
      const compIndex = lines.findIndex(l => l.includes('@Component'));
      issues.push({
        type: 'anti_pattern',
        message: 'Component is missing ChangeDetectionStrategy.OnPush. Consider adding it for optimized performance',
        line: compIndex !== -1 ? compIndex + 1 : undefined,
        suggestion: "Add 'changeDetection: ChangeDetectionStrategy.OnPush' inside the @Component decorator options."
      });
    }

    // Check RxJS Subscription Memory Leak
    if (this.config.rules?.rxjsMemoryLeak) {
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
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (this.config.rules?.toPromise && line.includes('.toPromise()')) {
        issues.push({
          type: 'deprecated_api',
          message: 'toPromise() is deprecated - use firstValueFrom or lastValueFrom from rxjs',
          line: lineNumber,
          suggestion: "Change '.toPromise()' to 'firstValueFrom(observable)' (import from 'rxjs')."
        });
      }

      if (this.config.rules?.httpModule && line.includes('HttpModule')) {
        issues.push({
          type: 'deprecated_api',
          message: 'HttpModule is deprecated - use HttpClientModule instead',
          line: lineNumber,
          suggestion: "Replace 'HttpModule' imports with 'HttpClientModule'."
        });
      }

      if (this.config.rules?.viewChildStatic && line.includes('@ViewChild') && line.includes('static:')) {
        issues.push({
          type: 'deprecated_api',
          message: '@ViewChild static:true is deprecated',
          line: lineNumber,
          suggestion: "Remove the '{ static: true }' or '{ static: false }' option parameter entirely."
        });
      }

      // Direct reference to window or document
      if (this.config.rules?.windowDocumentReference && (/\bwindow\.[a-zA-Z]/.test(line) || /\bdocument\.[a-zA-Z]/.test(line))) {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct reference to window or document detected. Inject DOCUMENT token instead for SSR compatibility',
          line: lineNumber,
          suggestion: "Inject the DOCUMENT token in the constructor: constructor(@Inject(DOCUMENT) private document: Document) (import DOCUMENT from '@angular/common')."
        });
      }

      // Direct DOM manipulation via nativeElement
      if (this.config.rules?.nativeElementManipulation && line.includes('.nativeElement.')) {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct DOM manipulation via nativeElement detected. Use Renderer2 instead',
          line: lineNumber,
          suggestion: "Inject 'Renderer2' and use its methods (e.g. renderer.setStyle, renderer.setAttribute) instead of direct nativeElement mutation."
        });
      }

      // DOM Sanitizer bypass checks (XSS Security risk)
      if (this.config.rules?.bypassSecurityTrust && line.includes('bypassSecurityTrust')) {
        issues.push({
          type: 'security_issue',
          message: 'Bypassing Angular DOM Sanitizer (bypassSecurityTrustXXX) detected. Bypassing security checks can introduce critical XSS vulnerabilities',
          line: lineNumber,
          suggestion: "Ensure input data is heavily sanitized using a library like DOMPurify before displaying it, or avoid bypassing security trust."
        });
      }
    }

    if (this.config.rules?.nestedSubscriptions) {
      issues.push(...this.detectNestedSubscriptions(lines));
    }

    return issues;
  }

  /**
   * Identifies nested .subscribe() patterns in TS code to recommend flat mapping instead.
   * 
   * @param lines An array of lines representing the TypeScript file contents.
   * @returns An array of detected nested subscription issues.
   */
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

  /**
   * Scans HTML template files for legacy structural directives, missing trackBy functions,
   * index tracking in @for loops, and XSS risks like [innerHTML].
   * 
   * @param lines An array of lines representing the HTML template contents.
   * @returns An array of detected template issues.
   */
  private analyzeTemplate(lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (this.config.rules?.legacyStructuralDirectives && (line.includes('*ngIf') || line.includes('*ngFor'))) {
        issues.push({
          type: 'anti_pattern',
          message: 'Legacy structural directive syntax detected - consider migrating to Angular 17+ control flow (@if, @for)',
          line: lineNumber,
          suggestion: "Run Angular migration tool: 'ng g @angular/core:control-flow' to automatically migrate to @if/@for syntax."
        });
      }

      if (this.config.rules?.ngForTrackBy && line.includes('*ngFor') && !line.includes('trackBy')) {
        issues.push({
          type: 'anti_pattern',
          message: '*ngFor directive is missing trackBy. Consider adding trackBy to improve list rendering performance',
          line: lineNumber,
          suggestion: "Add a 'trackBy: trackById' function to the *ngFor loop to track items by a unique identifier."
        });
      }

      if (this.config.rules?.forTrackByIndex && line.includes('@for') && (line.includes('track $index') || line.includes('track index'))) {
        issues.push({
          type: 'anti_pattern',
          message: 'Discouraged @for tracking by index. Track by unique identifier instead if items can mutate',
          line: lineNumber,
          suggestion: "Change 'track $index' to track a unique field of the item (e.g. 'track item.id') to optimize rendering."
        });
      }

      if (this.config.rules?.innerHtmlBinding && line.includes('[innerHTML]')) {
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
