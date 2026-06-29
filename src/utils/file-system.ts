import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively scans a directory and returns files matching the given extensions
 * @param dir Directory to scan
 * @param extensions File extensions to include (e.g., ['.ts', '.html'])
 * @param excludePatterns Patterns to exclude
 */
export function scanDirectory(
  dir: string,
  extensions: string[],
  excludePatterns: string[] = []
): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...scanDirectory(fullPath, extensions, excludePatterns));
    } else {
      const shouldInclude = extensions.some(ext => fullPath.endsWith(ext));
      const shouldExclude = excludePatterns.some(pattern => fullPath.includes(pattern));
      
      if (shouldInclude && !shouldExclude) {
        files.push(fullPath);
      }
    }
  }

  return files;
}
