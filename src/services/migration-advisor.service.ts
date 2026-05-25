import type { ScanResult, FileAnalysisResult, MigrationStep } from '../types';

export class MigrationAdvisorService {
  public advise(scanResult: ScanResult, codeAnalysisResults: FileAnalysisResult[]): MigrationStep[] {
    const steps: MigrationStep[] = [];
    let stepCounter = 1;

    if (scanResult.metadata.isAngular21Plus) {
      const hasZoneJs = scanResult.packages.some(p => p.name === 'zone.js');
      if (hasZoneJs) {
        steps.push({
          step: stepCounter++,
          title: 'Migrate to Zoneless Architecture',
          description: 'Remove zone.js and update bootstrap to use ngZone: "noop"',
          priority: 'medium'
        });
      }
    }

    const hasControlFlowIssues = codeAnalysisResults.some(r => 
      r.issues.some(i => i.type === 'anti_pattern')
    );
    if (hasControlFlowIssues) {
      steps.push({
        step: stepCounter++,
        title: 'Migrate to Angular 17+ Control Flow',
        description: 'Replace *ngIf/*ngFor with @if/@for syntax',
        priority: 'medium'
      });
    }

    const hasRxJsIssues = codeAnalysisResults.some(r => 
      r.issues.some(i => i.type === 'rxjs_issue')
    );
    if (hasRxJsIssues) {
      steps.push({
        step: stepCounter++,
        title: 'Fix RxJS Bad Patterns',
        description: 'Replace nested subscriptions with higher-order operators',
        priority: 'high'
      });
    }

    const hasDeprecatedApis = codeAnalysisResults.some(r => 
      r.issues.some(i => i.type === 'deprecated_api')
    );
    if (hasDeprecatedApis) {
      steps.push({
        step: stepCounter++,
        title: 'Replace Deprecated APIs',
        description: 'Update toPromise(), @ViewChild, and other deprecated APIs',
        priority: 'high'
      });
    }

    return steps;
  }
}
