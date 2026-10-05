import fs from 'node:fs';
import path from 'node:path';

// Guards on the CI and image files of the template: BFFs are generated from them, so a disabled
// pipeline, a drifting CICD pin or Node version, an unpinned base image or an over-privileged
// auto-approve job would spread to every new BFF.
const read = (file: string) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('CI workflows', () => {
  const cicd = read('.github/workflows/cicd.yml');
  const activeLines = cicd.split('\n').filter((line) => !line.trimStart().startsWith('#'));

  it('runs the reusable BFF pipeline (cicd.yml is not commented out)', () => {
    expect(activeLines.join('\n')).toMatch(/uses: mairie360\/CICD\/\.github\/workflows\/BFFs-cicd\.yml@v\d+\.\d+\.\d+/);
  });

  it('pins cicd_version to the tag of the reusable workflow', () => {
    const tag = /BFFs-cicd\.yml@(v\d+\.\d+\.\d+)/.exec(cicd)?.[1];
    const version = /^\s*cicd_version:\s*["']?(v\d+\.\d+\.\d+)/m.exec(cicd)?.[1];
    expect(tag).toBeDefined();
    expect(version).toBe(tag);
  });

  it('builds with Node 24, like contracts.yml and the images', () => {
    expect(cicd).toMatch(/^\s*node_version:\s*["']24["']/m);
    expect(read('.github/workflows/contracts.yml')).toMatch(/node-version:\s*["']24["']/);
  });

  it.each(['Dockerfile', 'development.Dockerfile'])('pins every base image of %s by digest', (file) => {
    const bases = read(file).split('\n').filter((line) => /^FROM\s/i.test(line));
    expect(bases.length).toBeGreaterThan(0);
    for (const line of bases) expect(line).toMatch(/^FROM node:24-alpine@sha256:[0-9a-f]{64}(\s|$)/);
  });

  it('approves only Renovate PRs, with pull-requests: write only', () => {
    const autoApprove = read('.github/workflows/auto-approve.yml');
    expect(autoApprove).toMatch(/if: github\.actor == 'renovate\[bot\]'/);
    expect(autoApprove).toMatch(/pull-requests: write/);
    expect(autoApprove).not.toMatch(/contents: write/);
  });
});
