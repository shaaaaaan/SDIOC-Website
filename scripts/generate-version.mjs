import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

let commitHash = process.env['CF_PAGES_COMMIT_SHA']?.substring(0, 7) ||
                 process.env['COMMIT_SHA']?.substring(0, 7) ||
                 process.env['GITHUB_SHA']?.substring(0, 7) ||
                 '';

if (!commitHash) {
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    commitHash = 'release';
  }
}

let buildTime = new Date().toISOString();

const versionInfo = {
  commit: commitHash,
  builtAt: buildTime
};

const targetDir = join(process.cwd(), 'src', 'environments');
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

const fileContent = `// Auto-generated build version\nexport const version = ${JSON.stringify(versionInfo, null, 2)};\n`;

writeFileSync(join(targetDir, 'version.ts'), fileContent, 'utf-8');
console.log(`[Version Generator] Git Commit Hash: ${commitHash} written to src/environments/version.ts`);
