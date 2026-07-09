import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';

const routeDirectory = path.resolve(
  process.cwd(),
  'apps/remix/app/routes/_authenticated+/t.$teamUrl+',
);

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
assert.equal(
  existsSync(path.join(routeDirectory, 'authorizations.$id.tsx')),
  false,
  'authorization.$id.tsx shadows /authorizations/:id/edit when it has no outlet',
);
