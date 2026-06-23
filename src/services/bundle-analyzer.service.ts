import * as fs from 'fs';
import * as path from 'path';
import type { BundleAnalysisResult, BundleFile, Config } from '../types';

/**
 * Service for analyzing Angular build bundle sizes
 */
export class BundleAnalyzerService {
  private readonly config: Config;
  private readonly defaultDistPaths: string[] = ['dist', 'dist/browser', 'build'];

  constructor(config?: Config) {
    this.config = config || {};
  }

  /**
   * Formats a byte size into a human-readable string (e.g., 1.2 MB, 500 KB)
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Determines the type of bundle file based on its name
   */
  private getBundleType(filename: string): BundleFile['type'] {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('main')) return 'main';
    if (lowerName.includes('polyfill')) return 'polyfills';
    if (lowerName.includes('style')) return 'styles';
    if (lowerName.includes('script')) return 'scripts';
    if (lowerName.includes('vendor')) return 'vendor';
    if (lowerName.includes('chunk')) return 'chunk';
    return 'other';
  }

  /**
   * Finds common Angular build distribution directories
   */
  private findDistDirectory(projectPath: string): string | null {
    for (const distPath of this.defaultDistPaths) {
      const fullPath = path.join(projectPath, distPath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Recursively scans a directory for bundle files (.js, .css)
   */
  private scanDirectoryForBundles(dirPath: string): string[] {
    const bundleFiles: string[] = [];

    if (!fs.existsSync(dirPath)) return bundleFiles;

    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        bundleFiles.push(...this.scanDirectoryForBundles(fullPath));
      } else if (
        item.endsWith('.js') || 
        item.endsWith('.css') || 
        item.endsWith('.mjs')
      ) {
        bundleFiles.push(fullPath);
      }
    }
    return bundleFiles;
  }

  /**
   * Generates bundle size warnings based on file sizes
   */
  private generateWarnings(bundles: BundleFile[]): string[] {
    const warnings: string[] = [];
    const MB_THRESHOLD = 2 * 1024 * 1024; // 2 MB
    const MAIN_BUNDLE_THRESHOLD = 1 * 1024 * 1024; // 1 MB

    for (const bundle of bundles) {
      if (bundle.type === 'main' && bundle.sizeBytes > MAIN_BUNDLE_THRESHOLD) {
        warnings.push(
          `Main bundle (${bundle.path}) is larger than recommended (${this.formatBytes(bundle.sizeBytes)} > 1 MB). Consider code splitting and lazy loading.`
        );
      } else if (bundle.sizeBytes > MB_THRESHOLD) {
        warnings.push(
          `Bundle (${bundle.path}) is large (${this.formatBytes(bundle.sizeBytes)}). Review dependencies and code.`
        );
      }
    }

    return warnings;
  }

  /**
   * Generates recommendations for reducing bundle size
   */
  private generateRecommendations(bundles: BundleFile[]): string[] {
    const recommendations: string[] = [];

    const mainBundle = bundles.find(b => b.type === 'main');
    const hasLargeMain = mainBundle !== undefined && mainBundle.sizeBytes > 1 * 1024 * 1024;
    const hasLargeVendor = bundles.some(b => b.type === 'vendor' && b.sizeBytes > 500 * 1024);
    const hasNoChunks = !bundles.some(b => b.type === 'chunk');
    const hasLargeNonChunk = bundles.some(
      b => b.type !== 'chunk' && b.type !== 'styles' && b.sizeBytes > 500 * 1024
    );

    // Always suggest the CLI build optimizer — it is universally applicable
    recommendations.push("Consider using Angular CLI's built-in build optimizer (ng build --configuration production)");

    if (hasLargeMain || hasNoChunks) {
      recommendations.push('Use lazy loading for feature modules to reduce the initial bundle size');
    }

    if (hasLargeNonChunk) {
      recommendations.push('Tree-shake unused dependencies and remove dead code to reduce bundle weight');
    }

    if (hasLargeVendor) {
      recommendations.push('Vendor bundle is large — consider splitting into smaller chunks or using differential loading');
    }

    recommendations.push('Optimise images and assets (use WebP, compress SVGs, enable asset hashing)');

    return recommendations;
  }

  /**
   * Analyzes bundle sizes in an Angular project
   * @param projectPath Root directory of the project
   * @param customDistPath Optional custom distribution directory path
   */
  public analyze(projectPath: string = process.cwd(), customDistPath?: string): BundleAnalysisResult | null {
    // Find distribution directory
    let distPath = customDistPath 
      ? path.resolve(projectPath, customDistPath) 
      : this.findDistDirectory(projectPath);

    if (!distPath || !fs.existsSync(distPath)) {
      return null;
    }

    // Find all bundle files
    const bundlePaths = this.scanDirectoryForBundles(distPath);

    if (bundlePaths.length === 0) {
      return null;
    }

    // Analyze each bundle file
    const bundles: BundleFile[] = bundlePaths.map(bundlePath => {
      const stats = fs.statSync(bundlePath);
      const filename = path.basename(bundlePath);
      const relativePath = path.relative(projectPath, bundlePath);

      return {
        path: relativePath,
        sizeBytes: stats.size,
        sizeHumanReadable: this.formatBytes(stats.size),
        type: this.getBundleType(filename)
      };
    });

    // Calculate total size
    const totalSizeBytes = bundles.reduce((sum, bundle) => sum + bundle.sizeBytes, 0);

    return {
      totalSizeBytes,
      totalSizeHumanReadable: this.formatBytes(totalSizeBytes),
      files: bundles,
      warnings: this.generateWarnings(bundles),
      recommendations: this.generateRecommendations(bundles)
    };
  }
}
