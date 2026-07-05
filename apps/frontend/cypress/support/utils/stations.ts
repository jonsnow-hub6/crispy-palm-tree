type StationSeed = {
  name: string;
  stationLinks: Array<{ host: string; port: number }>;
};

export const interceptStationCreate = () => {
  cy.intercept('POST', '**/api/collections/stations/records').as(
    'createStation',
  );
};

export const seedStationsInPocketBase = (stations: StationSeed[]) => {
  cy.request({
    method: 'POST',
    url: 'http://127.0.0.1:8090/api/collections/_superusers/auth-with-password',
    body: {
      identity: Cypress.env('POCKETBASE_USERNAME'),
      password: Cypress.env('POCKETBASE_PASSWORD'),
    },
  }).then(({ body }) => {
    const token = body.token;

    stations.forEach((station) => {
      cy.request({
        method: 'POST',
        url: 'http://127.0.0.1:8090/api/collections/stations/records',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: station,
      });
    });
  });
};

export const triggerStationProbeInPocketBase = () => {
  cy.request({
    method: 'POST',
    url: 'http://127.0.0.1:8090/api/cron/probe-all ',
  })
    .its('status')
    .should('eq', 200);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertScalarPayload = (
  actual: unknown,
  expected: unknown,
  path: string,
) => {
  expect(actual, `${path} should match expected value`).to.equal(expected);
};

const assertArrayPayload = (
  actual: unknown,
  expected: unknown[],
  path: string,
) => {
  expect(actual, path).to.be.an('array');
  expected.forEach((value, index) => {
    assertPayloadValue(
      (actual as unknown[] | undefined)?.[index],
      value,
      `${path}[${index}]`,
    );
  });
};

const assertObjectPayload = (
  actual: unknown,
  expected: Record<string, unknown>,
  path: string,
) => {
  expect(actual, path).to.be.an('object');
  Object.entries(expected).forEach(([field, value]) => {
    assertPayloadValue(
      (actual as Record<string, unknown> | undefined)?.[field],
      value,
      `${path}.${field}`,
    );
  });
};

const assertPayloadValue = (
  actual: unknown,
  expected: unknown,
  path: string,
) => {
  if (Array.isArray(expected)) {
    assertArrayPayload(actual, expected, path);
    return;
  }

  if (isPlainObject(expected)) {
    assertObjectPayload(actual, expected, path);
    return;
  }

  assertScalarPayload(actual, expected, path);
};

export const assertStationCreatePayload = (
  expectedValues: Record<string, unknown>,
) => {
  cy.wait('@createStation')
    .its('request.body')
    .should((body) => {
      assertPayloadValue(body, expectedValues, 'request.body');
    });
};
