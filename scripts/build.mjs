// Builds dist/index.js for the production image.
//
// The @mairie360/*-openapi packages are published as TypeScript (their `main` is a .ts file): `tsc`
// does not compile them, so `node dist/index.js` could not load them. esbuild inlines them in the
// bundle; every other dependency stays external and is resolved from node_modules.
import { build } from 'esbuild';

const bundleOnlyGeneratedClients = {
  name: 'bundle-only-generated-clients',
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, ({ path }) =>
      path.startsWith('@mairie360/') ? undefined : { external: true },
    );
  },
};

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
  plugins: [bundleOnlyGeneratedClients],
});
