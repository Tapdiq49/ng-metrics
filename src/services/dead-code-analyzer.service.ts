import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, ClassDeclaration, Node, ObjectLiteralExpression, PropertyAssignment } from 'ts-morph';
import type { FileAnalysisResult } from '../types';

export class DeadCodeAnalyzerService {
  /**
   * Analyzes the project for components, directives, and pipes that are declared
   * but never used in any template or route.
   */
  public analyze(projectPath: string, srcDir: string): FileAnalysisResult[] {
    const results: FileAnalysisResult[] = [];
    const absoluteSrcDir = path.resolve(projectPath, srcDir);

    if (!fs.existsSync(absoluteSrcDir)) {
      return results;
    }

    const project = new Project({
      skipAddingFilesFromTsConfig: true
    });

    // Add all TS files in src manually to avoid glob path issues on Windows
    const allTsFiles = this.scanFiles(absoluteSrcDir, '.ts');
    for (const tsFile of allTsFiles) {
      if (fs.existsSync(tsFile)) {
        project.addSourceFileAtPath(tsFile);
      }
    }

    const allHtmlFiles = this.scanFiles(absoluteSrcDir, '.html');
    let allHtmlContent = '';

    for (const htmlFile of allHtmlFiles) {
      allHtmlContent += fs.readFileSync(htmlFile, 'utf8') + '\n';
    }

    const sourceFiles = project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const classes = sourceFile.getClasses();

      for (const classDecl of classes) {
        const isComponent = classDecl.getDecorator('Component') !== undefined || classDecl.getDecorators().some(d => d.getName() === 'Component');
        const isDirective = classDecl.getDecorator('Directive') !== undefined || classDecl.getDecorators().some(d => d.getName() === 'Directive');
        const isPipe = classDecl.getDecorator('Pipe') !== undefined || classDecl.getDecorators().some(d => d.getName() === 'Pipe');

        if (isComponent || isDirective || isPipe) {
          const typeName = isComponent ? 'Component' : isDirective ? 'Directive' : 'Pipe';
          const className = classDecl.getName();

          if (!className) continue;

          // Exclude app.component.ts as it's the root component
          if (className === 'AppComponent') continue;

          // Check if used in HTML
          let usedInHtml = false;
          let selector = this.extractSelectorOrName(classDecl);

          if (selector && allHtmlContent.includes(selector)) {
            usedInHtml = true;
          }

          // Check if used in Routing (by checking if the class name appears in routing modules)
          let usedInRouting = false;
          const references = classDecl.findReferencesAsNodes();
          for (const ref of references) {
            const refFile = ref.getSourceFile().getFilePath();
            const refLine = ref.getParent()?.getText() || '';
            // If it's used in a route definition (path, component) or lazy loading
            if (refLine.includes('component:') || refLine.includes('loadComponent:')) {
              usedInRouting = true;
              break;
            }
          }

          // If not used in HTML and not used in Routing, we flag it.
          // Note: Pipes might just be checked by their name.
          if (!usedInHtml && !usedInRouting) {
            const filePath = classDecl.getSourceFile().getFilePath();
            let fileResult = results.find(r => r.file === filePath);
            if (!fileResult) {
              fileResult = { file: filePath, issues: [] };
              results.push(fileResult);
            }

            fileResult.issues.push({
              type: 'anti_pattern',
              message: `Dead Code Detected: ${typeName} '${className}' appears to be unused. Selector/Name '${selector}' not found in any template and not used in routing.`,
              line: classDecl.getStartLineNumber(),
              suggestion: 'Consider removing this file and its references from the module.'
            });
          }
        }
      }
    }

    return results;
  }

  private extractSelectorOrName(classDecl: ClassDeclaration): string | null {
    let selector = null;
    const decorator = classDecl.getDecorator('Component') || classDecl.getDecorator('Directive') || classDecl.getDecorator('Pipe');

    if (decorator) {
      const args = decorator.getArguments();
      if (args.length > 0 && args[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
        const obj = args[0] as ObjectLiteralExpression;
        let propertyName = classDecl.getDecorator('Pipe') || classDecl.getDecorators().some(d => d.getName() === 'Pipe') ? 'name' : 'selector';
        const prop = obj.getProperty(propertyName);

        if (prop && Node.isPropertyAssignment(prop)) {
          selector = prop.getInitializer()?.getText().replace(/['"]/g, '') || null;
        }
      }
    }

    return selector;
  }

  private scanFiles(dir: string, extension: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.scanFiles(fullPath, extension));
      } else if (fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
