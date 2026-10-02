import fs from 'node:fs';
import path from 'node:path';

// Guards on the CI files of the template: BFFs are generated from them, so a disabled pipeline,
// a drifting CICD pin or an over-privileged auto-approve job would spread to every new BFF.
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

  it('approves only Renovate PRs, with pull-requests: write only', () => {
    const autoApprove = read('.github/workflows/auto-approve.yml');
    expect(autoApprove).toMatch(/if: github\.actor == 'renovate\[bot\]'/);
    expect(autoApprove).toMatch(/pull-requests: write/);
    expect(autoApprove).not.toMatch(/contents: write/);
  });
});
