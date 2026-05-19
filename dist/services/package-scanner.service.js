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
exports.PackageScannerService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PackageScannerService {
    scan(projectPath = process.cwd()) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            throw new Error('package.json not found in current directory');
        }
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const packages = [];
        for (const [name, version] of Object.entries(allDependencies)) {
            if (this.isAngularPackage(name)) {
                const metadata = { name, version: version };
                if (name === 'zone.js') {
                    metadata.status = 'legacy / optional (Angular 21 zoneless architecture support)';
                    metadata.recommendation = 'Consider removing for Angular 21+ zoneless projects';
                }
                packages.push(metadata);
            }
        }
        const angularCorePackage = packages.find(p => p.name === '@angular/core');
        let angularVersion;
        let isAngular21Plus = false;
        if (angularCorePackage?.version) {
            angularVersion = angularCorePackage.version.replace(/[\^~]/, '');
            const majorVersion = parseInt(angularVersion.split('.')[0], 10);
            isAngular21Plus = majorVersion >= 21;
        }
        return {
            metadata: {
                angularVersion,
                isAngular21Plus
            },
            packages
        };
    }
    isAngularPackage(name) {
        return PackageScannerService.ANGULAR_PACKAGE_PATTERNS.some((pattern) => pattern.test(name)) || name === 'zone.js';
    }
}
exports.PackageScannerService = PackageScannerService;
PackageScannerService.ANGULAR_PACKAGE_PATTERNS = [
    /^@angular\/.*/,
    /^@ngrx\/.*/,
    /^rxjs$/,
    /^@angular\/material$/,
    /^@angular\/cdk$/
];
