import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const serverDirectory = path.resolve(process.cwd(), 'packages/trpc/server');
const authorizationRouterPath = path.join(serverDirectory, 'executive-authorization-router/router.ts');
const profileTypesPath = path.join(serverDirectory, 'executive-authorization-router/profile.types.ts');

assert.ok(existsSync(authorizationRouterPath), 'executive authorization router must exist');
assert.ok(existsSync(profileTypesPath), 'executive authorization profile API types must exist');

const rootRouter = readFileSync(path.join(serverDirectory, 'router.ts'), 'utf8');
const authorizationRouter = readFileSync(authorizationRouterPath, 'utf8');
const createTypes = readFileSync(
  path.join(serverDirectory, 'executive-authorization-router/create-authorization.types.ts'),
  'utf8',
);
const profileTypes = readFileSync(profileTypesPath, 'utf8');

assert.match(rootRouter, /executiveAuthorization:\s*executiveAuthorizationRouter/);
assert.match(authorizationRouter, /create:\s*createAuthorizationRoute/);
assert.match(authorizationRouter, /profile:\s*\{/);
assert.match(authorizationRouter, /get:\s*getAuthorizationProfileRoute/);
assert.match(authorizationRouter, /update:\s*updateAuthorizationProfileRoute/);
assert.match(createTypes, /path:\s*'\/executive-authorization\/create'/);
assert.match(profileTypes, /profilePath\s*=\s*'\/executive-authorization\/profile\/\{templateKey\}'/);
assert.match(profileTypes, /method:\s*'GET'[\s\S]*path:\s*profilePath/);
assert.match(profileTypes, /method:\s*'POST'[\s\S]*path:\s*profilePath/);

console.log('executive authorization API route tests passed');
