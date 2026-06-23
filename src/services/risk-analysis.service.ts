import type { ScanResult, PackageMetadata, HealthScore } from '../types';

export class RiskAnalysisService {

  // TODO: Update this constant with each new Angular major release.
  // Current value reflects Angular 22 (latest as of June 2026).
  private static readonly LATEST_ANGULAR_VERSION = 22;

  private static readonly RISKY_PACKAGES = ['tslint', 'codelyzer'];

  public analyze(scanResult: ScanResult): HealthScore {
    const issues: string[] = [];
    let totalScore = 100;

    totalScore -= this.calculateAngularVersionAgePenalty(scanResult, issues);
    totalScore -= this.calculateDeprecatedPackagesPenalty(scanResult, issues);
    totalScore -= this.calculateZoneJsPenalty(scanResult, issues);
    totalScore -= this.calculateOutdatedDependenciesPenalty(scanResult, issues);
    totalScore -= this.calculateRiskyPackagesPenalty(scanResult, issues);

    const finalScore = Math.max(0, totalScore);
    const level = this.getHealthLevel(finalScore);

    return { score: finalScore, level, issues };
  }

  private calculateAngularVersionAgePenalty(scanResult: ScanResult, issues: string[]): number {
    if (!scanResult.metadata.angularVersion) {
      issues.push('No Angular version detected');
      return 25;
    }

    const majorVersion = parseInt(scanResult.metadata.angularVersion.split('.')[0], 10);
    const versionDiff = RiskAnalysisService.LATEST_ANGULAR_VERSION - majorVersion;

    if (versionDiff <= 0) {
      return 0;
    }

    const penalty = Math.min(25, versionDiff * 10);
    issues.push(`Angular version ${majorVersion} is ${versionDiff} versions behind latest (${RiskAnalysisService.LATEST_ANGULAR_VERSION})`);
    return penalty;
  }

  private calculateDeprecatedPackagesPenalty(scanResult: ScanResult, issues: string[]): number {
    const deprecatedPackages: PackageMetadata[] = [];
    for (const pkg of scanResult.packages) {
      if (pkg.status?.includes('deprecated') || pkg.status?.includes('legacy')) {
        // Exclude risky packages (they have their own specific penalty and fix suggestions
        // under calculateRiskyPackagesPenalty to avoid double-penalizing the project health score)
        if (RiskAnalysisService.RISKY_PACKAGES.includes(pkg.name)) {
          continue;
        }
        // Exclude zone.js in Angular 21+ (since zone.js in Angular 21+ is specifically monitored
        // and penalized separately in calculateZoneJsPenalty)
        if (pkg.name === 'zone.js' && scanResult.metadata.isAngular21Plus) {
          continue;
        }
        deprecatedPackages.push(pkg);
      }
    }

    if (deprecatedPackages.length === 0) {
      return 0;
    }

    const penalty = Math.min(20, deprecatedPackages.length * 10);
    issues.push(`Found ${deprecatedPackages.length} deprecated/legacy package(s): ${deprecatedPackages.map(p => p.name).join(', ')}`);
    return penalty;
  }

  private calculateZoneJsPenalty(scanResult: ScanResult, issues: string[]): number {
    if (!scanResult.metadata.isAngular21Plus) {
      return 0;
    }

    const hasZoneJs = scanResult.packages.some(pkg => pkg.name === 'zone.js');
    if (hasZoneJs) {
      issues.push('zone.js detected in Angular 21+ project - consider migrating to zoneless');
      return 15;
    }

    return 0;
  }

  private calculateOutdatedDependenciesPenalty(scanResult: ScanResult, issues: string[]): number {
    let outdatedCount = 0;

    for (const pkg of scanResult.packages) {
      if (pkg.version?.startsWith('^') || pkg.version?.startsWith('~')) {
        const version = pkg.version.slice(1);
        const major = parseInt(version.split('.')[0], 10);

        if (pkg.name.startsWith('@angular/') && major < RiskAnalysisService.LATEST_ANGULAR_VERSION) {
          outdatedCount++;
        }
      }
    }

    if (outdatedCount === 0) {
      return 0;
    }

    const penalty = Math.min(25, outdatedCount * 8);
    issues.push(`Found ${outdatedCount} potentially outdated Angular package(s)`);
    return penalty;
  }

  private calculateRiskyPackagesPenalty(scanResult: ScanResult, issues: string[]): number {
    const foundRiskyPackages: string[] = [];
    const allPackageNames = scanResult.packages.map(pkg => pkg.name);

    for (const risky of RiskAnalysisService.RISKY_PACKAGES) {
      if (allPackageNames.includes(risky)) {
        foundRiskyPackages.push(risky);
      }
    }

    if (foundRiskyPackages.length === 0) {
      return 0;
    }

    const penalty = Math.min(15, foundRiskyPackages.length * 10);
    issues.push(`Found risky package(s): ${foundRiskyPackages.join(', ')}`);
    return penalty;
  }

  private getHealthLevel(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= 85) {
      return 'excellent';
    } else if (score >= 65) {
      return 'good';
    } else if (score >= 40) {
      return 'warning';
    } else {
      return 'critical';
    }
  }
}
