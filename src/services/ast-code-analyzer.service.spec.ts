import { describe, it, expect, beforeEach } from 'vitest';
import { AstCodeAnalyzerService } from './ast-code-analyzer.service';

describe('AstCodeAnalyzerService', () => {
  let service: AstCodeAnalyzerService;

  beforeEach(() => {
    service = new AstCodeAnalyzerService();
  });

  it('should detect missing OnPush change detection in components', () => {
    // ARRANGE
    const tsContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-test',
        template: ''
      })
      export class TestComponent { }
    `;

    // ACT
    const issues = service.analyzeTypeScriptFile('test.component.ts', tsContent);

    // ASSERT
    const onPushIssue = issues.find(i =>
      i.message.includes('ChangeDetectionStrategy.OnPush')
    );

    expect(onPushIssue).toBeDefined();
    expect(onPushIssue?.type).toBe('anti_pattern');
  });

  it('should detect window.document direct access', () => {
    // ARRANGE
    const tsContent = `
      import { Component } from '@angular/core';

      @Component({
        selector: 'app-test',
        template: '',
        changeDetection: 1
      })
      export class TestComponent {
        ngOnInit() {
          console.log(window.location.href);
        }
      }
    `;

    // ACT
    const issues = service.analyzeTypeScriptFile('test.component.ts', tsContent);

    // ASSERT
    const windowIssue = issues.find(i =>
      i.message.includes('Direct reference to window or document')
    );

    expect(windowIssue).toBeDefined();
  });

  it('should detect nativeElement direct DOM manipulation', () => {
    // ARRANGE
    const tsContent = `
      import { Component, ViewChild, ElementRef } from '@angular/core';

      @Component({
        selector: 'app-test',
        template: '<div #myDiv></div>'
      })
      export class TestComponent {
        @ViewChild('myDiv') myDiv!: ElementRef;
        
        ngAfterViewInit() {
          this.myDiv.nativeElement.style.color = 'red';
        }
      }
    `;

    // ACT
    const issues = service.analyzeTypeScriptFile('test.component.ts', tsContent);

    // ASSERT
    const nativeElementIssue = issues.find(i =>
      i.message.includes('Direct DOM manipulation via nativeElement')
    );

    expect(nativeElementIssue).toBeDefined();
    expect(nativeElementIssue?.type).toBe('anti_pattern');
  });

  it('should detect toPromise() deprecation', () => {
    // ARRANGE
    const tsContent = `
      import { Component } from '@angular/core';
      import { HttpClient } from '@angular/common/http';

      @Component({
        selector: 'app-test',
        template: ''
      })
      export class TestComponent {
        constructor(private http: HttpClient) {}

        fetchData() {
          return this.http.get('/api/data').toPromise();
        }
      }
    `;

    // ACT
    const issues = service.analyzeTypeScriptFile('test.component.ts', tsContent);

    // ASSERT
    const toPromiseIssue = issues.find(i =>
      i.message.includes('toPromise() is deprecated')
    );

    expect(toPromiseIssue).toBeDefined();
    expect(toPromiseIssue?.type).toBe('deprecated_api');
  });

  it('should detect legacy structural directives (*ngIf, *ngFor) in HTML', () => {
    // ARRANGE
    const htmlContent = `
      <div *ngIf="isVisible">Hello</div>
      <ul><li *ngFor="let item of items">{{ item }}</li></ul>
    `;
    const htmlLines = htmlContent.split('\n');

    // ACT
    const issues = service.analyzeTemplateFile('test.html', htmlLines);

    // ASSERT
    const ngIfIssue = issues.find(i => i.message.includes('Legacy structural directive'));
    expect(ngIfIssue).toBeDefined();
  });

  it('should detect [innerHTML] binding', () => {
    // ARRANGE
    const htmlLines = ['<div [innerHTML]="dangerousHtml"></div>'];

    // ACT
    const issues = service.analyzeTemplateFile('test.html', htmlLines);

    // ASSERT
    const innerHtmlIssue = issues.find(i => i.message.includes('[innerHTML]'));

    expect(innerHtmlIssue).toBeDefined();
    expect(innerHtmlIssue?.type).toBe('security_issue');
  });
});
