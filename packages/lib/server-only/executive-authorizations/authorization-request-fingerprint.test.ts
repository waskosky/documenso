import assert from 'node:assert/strict';

import { buildExecutiveAuthorizationRequestFingerprint } from './authorization-request-fingerprint';

const request = {
  notes: 'Reviewed by counsel.',
  payload: {
    actionDate: '2026-07-11',
    actionTitle: 'Approve transaction',
    directors: [
      { email: 'one@example.test', name: 'Director One' },
      { email: 'two@example.test', name: 'Director Two' },
      { email: 'three@example.test', name: 'Director Three' },
    ],
  },
  templateKey: 'board_resolution_secretary_certificate',
  templateVersion: 1,
};

const reorderedRequest = {
  templateVersion: 1,
  templateKey: 'board_resolution_secretary_certificate',
  payload: {
    directors: request.payload.directors.map((director) => ({
      name: director.name,
      email: director.email,
    })),
    actionTitle: request.payload.actionTitle,
    actionDate: request.payload.actionDate,
  },
  notes: request.notes,
};

assert.equal(
  buildExecutiveAuthorizationRequestFingerprint(request),
  buildExecutiveAuthorizationRequestFingerprint(reorderedRequest),
);
assert.notEqual(
  buildExecutiveAuthorizationRequestFingerprint(request),
  buildExecutiveAuthorizationRequestFingerprint({
    ...request,
    notes: 'Different request context.',
  }),
);

console.log('executive authorization request fingerprint tests passed');
