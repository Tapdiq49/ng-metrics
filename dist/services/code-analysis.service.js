"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeAnalysisService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CodeAnalysisService {
    analyze(projectPath = process.cwd(), customSrcDir) {
        const results = [];
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
    scanDirectory(dir) {
        const files = [];
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files.push(...this.scanDirectory(fullPath));
            }
            else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html')) {
                files.push(fullPath);
            }
        }
        return files;
    }
    analyzeFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = [];
        const lines = content.split('\n');
        if (filePath.endsWith('.ts')) {
            issues.push(...this.analyzeTypeScript(lines));
        }
        else if (filePath.endsWith('.html')) {
            issues.push(...this.analyzeTemplate(lines));
        }
        return issues;
    }
    analyzeTypeScript(lines) {
        const issues = [];
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
        }
        issues.push(...this.detectNestedSubscriptions(lines));
        return issues;
    }
    detectNestedSubscriptions(lines) {
        const issues = [];
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
    analyzeTemplate(lines) {
        const issues = [];
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
        }
        return issues;
    }
}
exports.CodeAnalysisService = CodeAnalysisService;
