import * as fs from 'fs';
import * as path from 'path';

/**
 * Climbs up the directory tree starting from startDir until it finds a directory
 * containing a package.json file. Falls back to process.cwd() if none is found.
 */
export function findProjectRoot(startDir: string): string {
  let currentDir = path.resolve(startDir);

  try {
    if (fs.existsSync(currentDir) && fs.statSync(currentDir).isFile()) {
      currentDir = path.dirname(currentDir);
    }
  } catch (e) {
    // Ignore stat errors
  }

  while (true) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return process.cwd();
}
