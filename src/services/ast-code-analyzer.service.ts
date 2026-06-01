import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, ClassDeclaration, Decorator, CallExpression, PropertyAccessExpression, ObjectLiteralExpression } from 'ts-morph';
import type { CodeIssue, Config } from '../types';

export class AstCodeAnalyzerService {
  private config: Config;
  private project: Project;

  constructor(config?: Config) {
    this.config = config || {
      rules: {
        viewChildStatic: true,
        toPromise: true,
        changeDetectionOnPush: true,
        windowDocumentReference: true,
        nativeElementManipulation: true,
        rxjsMemoryLeak: true,
        nestedSubscriptions: true,
        innerHtmlBinding: true,
        bypassSecurityTrust: true,
        httpModule: true,
        legacyStructuralDirectives: true,
        ngForTrackBy: true,
        forTrackByIndex: true
      }
    };
    this.project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true
    });
  }

  public analyzeTypeScriptFile(filePath: string, content: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });

    // Analyze class declarations for components
    sourceFile.getClasses().forEach((classDecl) => {
      issues.push(...this.analyzeComponentClass(classDecl));
    });

    // Analyze all methods and expressions for issues
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const callExpr = node as CallExpression;
        issues.push(...this.analyzeCallExpression(callExpr));
      } else if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propAccess = node as PropertyAccessExpression;
        issues.push(...this.analyzePropertyAccess(propAccess));
      }
    });

    return issues;
  }

  private analyzeComponentClass(classDecl: ClassDeclaration): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const componentDecorator = classDecl.getDecorator('Component');

    if (componentDecorator && this.config.rules?.changeDetectionOnPush) {
      const decoratorArg = componentDecorator.getArguments()[0];
      if (decoratorArg && decoratorArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
        const objLiteral = decoratorArg as ObjectLiteralExpression;
        const hasOnPush = objLiteral.getProperty('changeDetection')?.getText().includes('ChangeDetectionStrategy.OnPush');
        if (!hasOnPush) {
          issues.push({
            type: 'anti_pattern',
            message: 'Component is missing ChangeDetectionStrategy.OnPush. Consider adding it for optimized performance',
            line: componentDecorator.getStartLineNumber(),
            suggestion: "Add 'changeDetection: ChangeDetectionStrategy.OnPush' inside the @Component decorator options."
          });
        }
      }
    }

    return issues;
  }

  private analyzeCallExpression(callExpr: CallExpression): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const expression = callExpr.getExpression();

    if (!expression) return issues;

    // Check toPromise() calls
    if (
      this.config.rules?.toPromise &&
      expression.getKind() === SyntaxKind.PropertyAccessExpression &&
      (expression as PropertyAccessExpression).getName() === 'toPromise'
    ) {
      issues.push({
        type: 'deprecated_api',
        message: 'toPromise() is deprecated - use firstValueFrom or lastValueFrom from rxjs',
        line: callExpr.getStartLineNumber(),
        suggestion: "Change '.toPromise()' to 'firstValueFrom(observable)' (import from 'rxjs')."
      });
    }

    // Check subscribe() calls for memory leaks
    if (
      this.config.rules?.rxjsMemoryLeak &&
      expression.getKind() === SyntaxKind.PropertyAccessExpression &&
      (expression as PropertyAccessExpression).getName() === 'subscribe'
    ) {
      issues.push({
        type: 'rxjs_issue',
        message: 'Potential memory leak: active subscription found',
        line: callExpr.getStartLineNumber(),
        suggestion: "Clean up the subscription using the 'takeUntil' operator with a destroy subject, or store it and call '.unsubscribe()' in ngOnDestroy()."
      });
    }

    return issues;
  }

  private analyzePropertyAccess(propAccess: PropertyAccessExpression): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const name = propAccess.getName();

    // Check window/document direct references
    if (this.config.rules?.windowDocumentReference) {
      const exprText = propAccess.getExpression().getText();
      if (exprText === 'window' || exprText === 'document') {
        issues.push({
          type: 'anti_pattern',
          message: 'Direct reference to window or document detected. Inject DOCUMENT token instead for SSR compatibility',
          line: propAccess.getStartLineNumber(),
          suggestion: "Inject the DOCUMENT token in the constructor: constructor(@Inject(DOCUMENT) private document: Document) (import DOCUMENT from '@angular/common')."
        });
      }
    }

    // Check nativeElement direct manipulation
    if (this.config.rules?.nativeElementManipulation && name === 'nativeElement') {
      issues.push({
        type: 'anti_pattern',
        message: 'Direct DOM manipulation via nativeElement detected. Use Renderer2 instead',
        line: propAccess.getStartLineNumber(),
        suggestion: "Inject 'Renderer2' and use its methods (e.g. renderer.setStyle, renderer.setAttribute) instead of direct nativeElement mutation."
      });
    }

    return issues;
  }

  public analyzeTemplateFile(filePath: string, lines: string[]): CodeIssue[] {
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

      if (this.config.rules?.ngForTrackBy && line.includes('*ngFor')) {
        if (!line.includes('trackBy')) {
          issues.push({
            type: 'anti_pattern',
            message: '*ngFor directive is missing trackBy. Consider adding trackBy to improve list rendering performance',
            line: lineNumber,
            suggestion: "Add a 'trackBy: trackById' function to the *ngFor loop to track items by a unique identifier."
          });
        }
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
