import * as fs from 'fs';
import * as path from 'path';
import { AstCodeAnalyzerService } from './ast-code-analyzer.service';
import { DeadCodeAnalyzerService } from './dead-code-analyzer.service';
import { scanDirectory } from '../utils/file-system';
import type { CodeIssue, FileAnalysisResult, Config } from '../types';

export class CodeAnalysisService {
  private config: Config;
  private astAnalyzer?: AstCodeAnalyzerService;

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
    
    if (this.config.useAst) {
      this.astAnalyzer = new AstCodeAnalyzerService(this.config);
    }
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

    const files = scanDirectory(srcDir, ['.ts', '.html'], this.config.exclude || []);

    for (const file of files) {
      if (this.shouldExcludeFile(file, projectPath)) {
        continue;
      }
      const issues = this.analyzeFile(file);
      if (issues.length > 0) {
        results.push({ file, issues });
      }
    }

    // Run Dead Code Analyzer
    const deadCodeAnalyzer = new DeadCodeAnalyzerService();
    const deadCodeResults = deadCodeAnalyzer.analyze(projectPath, customSrcDir || this.config.srcDir || 'src');
    
    // Merge dead code results
    for (const deadCodeFileResult of deadCodeResults) {
      const existingFileResult = results.find(r => r.file === deadCodeFileResult.file);
      if (existingFileResult) {
        existingFileResult.issues.push(...deadCodeFileResult.issues);
      } else {
        results.push(deadCodeFileResult);
      }
    }

    return results;
  }

  private shouldExcludeFile(filePath: string, projectPath: string): boolean {
    if (!this.config.exclude || this.config.exclude.length === 0) {
      return false;
    }
    // Normalize to forward slashes for cross-platform compatibility (Windows uses backslashes)
    const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
    return this.config.exclude.some(excludePattern => {
      if (excludePattern.endsWith('/')) {
        return relativePath.startsWith(excludePattern);
      }
      return relativePath.includes(excludePattern);
    });
  }

  /**
   * Triggers the appropriate scanner (TypeScript or Template) based on the file type.
   * 
   * @param filePath The absolute path of the file to analyze.
   * @returns An array of detected code issues.
   */
  private analyzeFile(filePath: string): CodeIssue[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    if (this.astAnalyzer) {
      if (filePath.endsWith('.ts')) {
        return this.astAnalyzer.analyzeTypeScriptFile(filePath, content);
      } else if (filePath.endsWith('.html')) {
        return this.astAnalyzer.analyzeTemplateFile(filePath, lines);
      }
    }

    const issues: CodeIssue[] = [];
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
    // We scan every subscribe() call individually. If the *whole file* already
    // contains a recognised cleanup token we assume it is handled, which avoids
    // the most common false-positive (one takeUntil covering all subscriptions).
    if (this.config.rules?.rxjsMemoryLeak) {
      const hasCleanupInFile =
        content.includes('.unsubscribe()') ||
        content.includes('takeUntil') ||
        content.includes('first(') ||
        content.includes('take(1)') ||
        content.includes('takeUntilDestroyed');

      if (!hasCleanupInFile) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('.subscribe(')) {
            issues.push({
              type: 'rxjs_issue',
              message: 'Potential memory leak: active subscription found without takeUntil, take(1), first(), or unsubscribe()',
              line: i + 1,
              suggestion: "Clean up the subscription using the 'takeUntil' operator with a destroy subject, or store it and call '.unsubscribe()' in ngOnDestroy()."
            });
          }
        }
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

      // Only flag static: true — static: false is still valid Angular syntax
      if (this.config.rules?.viewChildStatic && line.includes('@ViewChild') && /static\s*:\s*true/.test(line)) {
        issues.push({
          type: 'deprecated_api',
          message: '@ViewChild({ static: true }) is no longer needed — the static option was removed in Angular 9+',
          line: lineNumber,
          suggestion: "Remove the '{ static: true }' option from @ViewChild. The decorator resolves statically by default when no lifecycle hooks are involved."
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (line.includes('.subscribe(')) {
        if (subscriptionDepth > 0) {
          // We are already inside a subscribe block — this is nested
          issues.push({
            type: 'rxjs_issue',
            message: 'Nested subscriptions detected - consider using higher-order operators (switchMap, mergeMap, etc.)',
            line: lineNumber,
            suggestion: "Use higher-order mapping operators like 'switchMap', 'mergeMap', or 'concatMap' to chain observable requests cleanly."
          });
        }
      }

      // Count net open parens this line to track depth correctly.
      // Must be done AFTER the subscribe check so we capture the
      // depth *before* the current line's parens are applied.
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;

      if (line.includes('.subscribe(')) {
        // The opening '(' of .subscribe( is already counted above, so
        // just accumulate the net balance for the rest of the call.
        subscriptionDepth += openParens - closeParens + 1;
      } else {
        subscriptionDepth += openParens - closeParens;
      }

      if (subscriptionDepth < 0) {
        subscriptionDepth = 0;
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
