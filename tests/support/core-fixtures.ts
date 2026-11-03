import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import type { GetMeResponseView, Group } from '@mairie360/core-api-openapi/model';
import { eddsaToken } from './session-keys';

// Core API answers typed by the models of the installed @mairie360/core-api-openapi package: a field
// added, removed or renamed by the contract breaks the compilation of the tests. They are also
// validated at run time against the rebuilt contract (upstream-contracts.test.ts, HTTP mock).

/** Paths of the Core API operations, as the generated client builds them (`get*Url` helpers). */
export const coreApiUrls = getCoreAPIMairie360();

export function group(id: number, overrides: Partial<Group> = {}): Group {
  return { id, name: `Group ${id}`, description: `Description ${id}`, owner_id: 1, ...overrides };
}

/** Body of `GET /api/v1/user/me/` (GetMeResponseView). */
export function meResponse(overrides: Partial<GetMeResponseView> = {}): GetMeResponseView {
  return {
    email: 'anne.le-gall@mairie.test',
    first_name: 'Anne',
    last_name: 'Le Gall',
    phone: '+33123456789',
    role: 'User',
    status: 'active',
    groups: [group(1, { name: 'Urban planning' })],
    ...overrides,
  };
}

/** Profile the BFF answers for a `GET /api/v1/user/me/` body. */
export function profileOf(me: GetMeResponseView): Pick<GetMeResponseView, 'first_name' | 'last_name' | 'email'> {
  const { first_name, last_name, email } = me;
  return { first_name, last_name, email };
}

const tokens = new Map<string, string>();
/**
 * Session token of a named test session, signed like Core (EdDSA, MAIR-680), one per name for the whole run: the BFF
 * verifies it (requireSession), then forwards it as is to (mocked) Core API.
 */
export function tokenOf(session = 'session-anne'): string {
  if (!tokens.has(session)) tokens.set(session, eddsaToken(tokens.size + 1));
  return tokens.get(session)!;
}
export const bearer = (session = 'session-anne') => `Bearer ${tokenOf(session)}`;
