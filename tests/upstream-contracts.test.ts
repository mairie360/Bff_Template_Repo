import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ProfileSchema } from '../src/routes/example';
import { coreApiUrls, meResponse } from './support/core-fixtures';
import { loadOrvalContract, resolveOrvalPackage } from './support/orval-contract';

// The Core API contract is rebuilt from the installed @mairie360/core-api-openapi package: bumping its
// version in package.json is enough to test the BFF against the new contract.

const PACKAGE = '@mairie360/core-api-openapi';

// Core operations the BFF actually calls (src/routes/example.ts, src/routes/check_apis.ts), addressed
// through the URL helpers of the generated client.
const CONSUMED = [
  { operationId: 'getMe', method: 'get', url: coreApiUrls.getGetMeUrl() },
  { operationId: 'health', method: 'get', url: coreApiUrls.getHealthUrl() },
] as const;

const coreApi = loadOrvalContract(PACKAGE);

describe('Core API contract from the installed @mairie360/core-api-openapi package', () => {
  test('is Core API at the version pinned in package.json', () => {
    const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as Record<string, Record<string, string>>;
    expect(coreApi.title).toMatch(/^Core API/);
    expect(resolveOrvalPackage(PACKAGE).version).toBe(packageJson.devDependencies[PACKAGE]);
  });

  test.each(CONSUMED)('routes $method $url to $operationId', ({ operationId, method, url }) => {
    const { match, errors } = coreApi.validateRequest(method, new URL(url, 'http://upstream'));
    expect(errors).toEqual([]);
    expect((match?.operation as { operationId?: string } | undefined)?.operationId).toBe(operationId);
  });

  test('keeps the response model of GET /api/v1/user/me/', () => {
    const getMe = coreApi.match('GET', coreApiUrls.getGetMeUrl())!;
    expect(coreApi.responseSchema(getMe, 200)).toEqual({ documented: true, schema: { $ref: '#/components/schemas/GetMeResponseView' } });
    expect(coreApi.validate(coreApi.schema('GetMeResponseView'), meResponse())).toEqual([]);
  });

  test('the example profile only reads fields returned by GetMeResponseView', () => {
    const properties = Object.keys(coreApi.schema('GetMeResponseView').properties as object);
    expect(properties).toEqual(expect.arrayContaining(Object.keys(ProfileSchema.shape)));
  });
});
