import { pb } from '../consts';
import { Station } from '../types';

export const interceptStationCreate = () => {
  cy.intercept('POST', '**/api/collections/stations/records').as(
    'createStation',
  );
};

export const seedStationsInPocketBase = (stations: Station[]) => {
  stations.forEach((station) => {
    pb.collection('stations').create<Station>(station);
  });
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
