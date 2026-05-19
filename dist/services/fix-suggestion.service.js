"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixSuggestionService = void 0;
class FixSuggestionService {
    generate(healthScore, scanResult) {
        const suggestions = [];
        for (const issue of healthScore.issues) {
            const suggestion = this.createSuggestion(issue, scanResult);
            if (suggestion) {
                suggestions.push(suggestion);
            }
        }
        return this.groupSuggestions(suggestions);
    }
    createSuggestion(issue, scanResult) {
        if (issue.includes('tslint')) {
            return {
                issue,
                suggestion: 'Migrate from tslint to eslint using: ng add @angular-eslint/schematics',
                priority: 'high'
            };
        }
        if (issue.includes('codelyzer')) {
            return {
                issue,
                suggestion: 'Remove codelyzer (deprecated, use eslint instead)',
                priority: 'medium'
            };
        }
        if (issue.includes('zone.js detected in Angular 21+')) {
            return {
                issue,
                suggestion: 'Remove zone.js and update bootstrap to use zoneless architecture: bootstrapApplication(AppComponent, { ngZone: \'noop\' })',
                priority: 'medium'
            };
        }
        if (issue.includes('Angular version')) {
            const versionMatch = issue.match(/Angular version (\d+)/);
            const latestMatch = issue.match(/latest \((\d+)\)/);
            let suggestionText = 'Upgrade to the latest Angular version using ng update';
            if (versionMatch && latestMatch) {
                const current = parseInt(versionMatch[1], 10);
                const latest = parseInt(latestMatch[1], 10);
                suggestionText = `Step-by-step upgrade path from ${current} to ${latest}:\n`;
                for (let v = current + 1; v <= latest; v++) {
                    suggestionText += `  1. ng update @angular/core@${v} @angular/cli@${v}\n`;
                }
            }
            return {
                issue,
                suggestion: suggestionText,
                priority: 'high'
            };
        }
        if (issue.includes('outdated Angular package')) {
            return {
                issue,
                suggestion: 'Check for latest compatible versions using ng update',
                priority: 'medium'
            };
        }
        if (issue.includes('deprecated/legacy package')) {
            return {
                issue,
                suggestion: 'Review and update deprecated/legacy packages',
                priority: 'low'
            };
        }
        return null;
    }
    groupSuggestions(suggestions) {
        const autoFixable = [];
        const manualReviewRequired = [];
        for (const suggestion of suggestions) {
            if (suggestion.issue.includes('tslint') || suggestion.issue.includes('codelyzer')) {
                autoFixable.push(suggestion);
            }
            else {
                manualReviewRequired.push(suggestion);
            }
        }
        return { autoFixable, manualReviewRequired };
    }
}
exports.FixSuggestionService = FixSuggestionService;
