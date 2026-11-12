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

  // A reusable workflow cannot get more than its caller grants: without id-token: write (cosign keyless
  // signature of release-dev, mairie360/CICD MAIR-416) every run of cicd.yml ended in startup_failure.
  it('grants the permissions the reusable pipeline requests, id-token: write included', () => {
    const permissions = /^permissions:\n((?:\s+.+\n)+)/m.exec(cicd)?.[1] ?? '';
    for (const permission of ['contents: write', 'packages: write', 'id-token: write']) {
      expect(permissions).toContain(permission);
    }
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

  // MAIR-741: the npm bundled with node:24-alpine carries HIGH CVEs (brace-expansion, tar, undici...)
  // that fail the Trivy scan of Release Dev. The runtime stage only runs node, so it drops them.
  it('removes npm, npx, corepack and yarn from the runtime stage of the Dockerfile', () => {
    const stages = read('Dockerfile').split(/^FROM\s/im);
    const runtime = stages[stages.length - 1];
    expect(runtime).toMatch(/^CMD \["node", "dist\/index\.js"\]/m);
    // One line per instruction: join the `\` continuations, then keep the RUN that deletes.
    const removal = runtime
      .replace(/\\\n/g, ' ')
      .split('\n')
      .find((line) => /^RUN\s.*\brm -rf\s/.test(line));
    expect(removal).toBeDefined();
    const removed = removal!.split(/\s+/);
    for (const target of [
      '/usr/local/lib/node_modules/npm',
      '/usr/local/lib/node_modules/corepack',
      '/usr/local/bin/npm',
      '/usr/local/bin/npx',
      '/usr/local/bin/corepack',
      '/opt/yarn-*',
    ]) {
      expect(removed).toContain(target);
    }
  });

  it('approves only Renovate PRs, with pull-requests: write only', () => {
    const autoApprove = read('.github/workflows/auto-approve.yml');
    expect(autoApprove).toMatch(/if: github\.actor == 'renovate\[bot\]'/);
    expect(autoApprove).toMatch(/pull-requests: write/);
    expect(autoApprove).not.toMatch(/contents: write/);
  });
});
