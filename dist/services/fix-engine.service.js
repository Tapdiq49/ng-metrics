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
exports.FixEngineService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FixEngineService {
    apply(projectPath = process.cwd(), dryRun = true) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json not found');
        }
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const originalJson = JSON.parse(JSON.stringify(packageJson));
        const changes = [];
        changes.push(...this.removeUnsafePackages(packageJson));
        if (!dryRun) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }
        return { applied: !dryRun, changes };
    }
    removeUnsafePackages(packageJson) {
        const changes = [];
        for (const depType of ['dependencies', 'devDependencies']) {
            if (!packageJson[depType])
                continue;
            for (const pkgName of FixEngineService.SAFE_TO_REMOVE) {
                if (packageJson[depType][pkgName]) {
                    changes.push({
                        type: 'remove',
                        package: pkgName,
                        before: packageJson[depType][pkgName],
                        after: '(removed)'
                    });
                    delete packageJson[depType][pkgName];
                }
            }
        }
        return changes;
    }
}
exports.FixEngineService = FixEngineService;
FixEngineService.SAFE_TO_REMOVE = ['tslint', 'codelyzer'];
FixEngineService.UNSAFE_TO_UPGRADE = ['@angular/core', '@angular/common', '@angular/cli', 'rxjs'];
