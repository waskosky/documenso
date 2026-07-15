import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const routeDirectory = path.resolve(process.cwd(), 'apps/remix/app/routes/_authenticated+/t.$teamUrl+');

assert.ok(
  existsSync(path.join(routeDirectory, 'authorizations.$id._layout.tsx')),
  'authorization detail child routes need an outlet layout',
);
assert.ok(
  existsSync(path.join(routeDirectory, 'authorizations.$id._index.tsx')),
  'authorization detail route must be an index child so /edit can render separately',
);
assert.ok(
  existsSync(path.join(routeDirectory, 'authorizations.$id.edit.tsx')),
  'authorization edit route should remain a sibling child under the authorization id layout',
);
assert.ok(
  existsSync(path.join(routeDirectory, 'authorizations.settings.tsx')),
  'authorization profile settings should have a dedicated team route',
);
assert.equal(
  existsSync(path.join(routeDirectory, 'authorizations.$id.tsx')),
  false,
  'authorization.$id.tsx shadows /authorizations/:id/edit when it has no outlet',
);

const newAuthorizationRoute = readFileSync(path.join(routeDirectory, 'authorizations.new.tsx'), 'utf8');

assert.equal(
  newAuthorizationRoute.match(/requireAuthorizationManager\(team\.currentTeamRole\)/g)?.length,
  2,
  'new authorization loader and action must both require team-management permission',
);
assert.match(
  newAuthorizationRoute,
  /createProfiledExecutiveAuthorization/,
  'new authorizations should merge saved defaults and create the signing envelope through the profiled service',
);
assert.match(
  newAuthorizationRoute,
  /buildBoardAuthorizationDecisionInputFromFormData/,
  'new authorizations should accept only decision-specific form fields',
);
assert.match(
  newAuthorizationRoute,
  /AuthorizationProfileSummary/,
  'new authorizations should show managers the saved defaults that will be applied',
);
assert.match(
  newAuthorizationRoute,
  /BoardAuthorizationDecisionForm/,
  'new authorizations should render the focused decision form',
);
assert.match(newAuthorizationRoute, /extractRequestMetadata/, 'new authorization generation should be audited');
assert.match(newAuthorizationRoute, /randomUUID/, 'new authorization submissions should have an idempotency key');
assert.match(
  newAuthorizationRoute,
  /expectedRecipientCount = 3/,
  'new authorization generation should require exactly three recipients',
);
assert.match(
  newAuthorizationRoute,
  /expectedFieldCount = 9/,
  'new authorization generation should require exactly nine signing fields',
);
assert.match(newAuthorizationRoute, /recipientCount === expectedRecipientCount/);
assert.match(newAuthorizationRoute, /fieldCount === expectedFieldCount/);
assert.doesNotMatch(
  newAuthorizationRoute,
  /create-executive-authorization'/,
  'the web intake must not bypass the saved authorization profile',
);
assert.doesNotMatch(
  newAuthorizationRoute,
  /BoardAuthorizationForm/,
  'the web intake must not post profile-backed fields from the legacy full form',
);
assert.doesNotMatch(
  newAuthorizationRoute,
  /sendExecutiveAuthorization|send-executive-authorization/,
  'creating a review draft must never send email',
);
