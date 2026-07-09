/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import { RecordModel } from 'pocketbase';
import { AuthParameters } from '../types';
import { CREATE_USER_ARGS, pb } from './consts';
import { CreateStationArgs } from './utils/mock-stations/mock-stations-manager';
import { CreateUserArgs, Page } from './types/pages';

declare global {
  namespace Cypress {
    interface Cypress {
      env(key: 'POCKETBASE_USERNAME'): string;
      env(key: 'POCKETBASE_PASSWORD'): string;
    }
    interface Chainable {
      login(
        username?: string,
        password?: string,
        permission?: Page[],
      ): Chainable<Element>;
      logout(): Chainable<Element>;
      mockApi(): Chainable<void>;
      setPocketBaseAuth(
        auth: AuthParameters,
        username?: string,
        password?: string,
        permission?: Page[],
      ): Chainable<void>;
      getByAttribute(
        value: string,
        options?: { attribute?: string; extra?: string; isGlobal?: boolean },
      ): Chainable<any>;
      getSchemaFormField(
        name: string,
        formSelector?: string,
      ): Chainable<JQuery<HTMLElement>>;
      interactSchemaFormField(
        name: string,
        action: (input: JQuery<HTMLElement>) => void,
      ): Chainable<void>;
      interactSchemaFormInput(
        name: string,
        action: (input: JQuery<HTMLElement>) => void,
      ): Chainable<void>;
      fillSchemaFormFields(
        parameters: Record<string, string | number>,
      ): Chainable<void>;
      inputSchemaFormParameters(
        parameters: Record<string, string | number>,
      ): Chainable<void>;
      assertSchemaFormFieldValue(
        name: string,
        value: string | number,
      ): Chainable<void>;
      validateSchemaFormInput(
        name: string,
        value: string | number,
      ): Chainable<void>;
      submitSchemaForm(formSelector?: string): Chainable<void>;
      truncateCollection(collection: string): Chainable<void>;
      resetCollection(collections?: string[]): Chainable<void>;
      resetDB(): Chainable<void>;
      createMockStationServer(args: CreateStationArgs): Chainable<void>;
      stopMockStationServer(id: string): Chainable<void>;
      stopAllMockStationServers(): Chainable<void>;
      triggerProbeAllInPocketBase(): Chainable<void>;
      createDecoderId(decoderId: string): Chainable<void>;
      deleteDecoderId(decoderId: string): Chainable<void>;
      injectUsernameAndPasswordIntoPocketBase(
        userArgs: CreateUserArgs,
      ): Chainable<RecordModel>;
    }
  }
}

const DEFAULT_FORM_SELECTOR = '[data-cy="schema-form"]';

const normalizeFieldName = (name: string) =>
  name.toLowerCase().replace(/[_\s-]+/g, ' ');

const findDataCyField = ($form: JQuery<HTMLElement>, name: string) => {
  const fieldSelector = `[data-cy="schema-form-field-${name}"]`;
  return $form.find(fieldSelector).first();
};

const findCompactField = (
  $form: JQuery<HTMLElement>,
  normalizedName: string,
) => {
  return Array.from($form.find('input, select, textarea')).find((element) => {
    const htmlElement = element as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    const placeholder =
      htmlElement.getAttribute('placeholder')?.toLowerCase() ?? '';
    const fieldName = htmlElement.getAttribute('name')?.toLowerCase() ?? '';

    return placeholder === normalizedName || fieldName === normalizedName;
  });
};

const findLabelLinkedField = (
  $form: JQuery<HTMLElement>,
  normalizedName: string,
) => {
  const label = Array.from($form.find('label')).find((element) => {
    const htmlElement = element as HTMLElement;
    const text = htmlElement.textContent?.trim().toLowerCase() ?? '';
    const labelFor = htmlElement.getAttribute('for')?.toLowerCase() ?? '';

    return (
      text.includes(normalizedName) ||
      labelFor === normalizedName.replace(/\s/g, '')
    );
  });

  if (!label) {
    return null;
  }

  const htmlLabel = label as HTMLElement;
  const inputId = htmlLabel.getAttribute('for');
  if (inputId) {
    const input = $form.find(`#${inputId}`).first();
    if (input.length) {
      return input;
    }
  }

  const fallbackInput = Cypress.$(htmlLabel)
    .parent()
    .find('input, select, textarea')
    .first();
  return fallbackInput.length ? fallbackInput : null;
};

const getFallbackField = ($form: JQuery<HTMLElement>) => {
  return $form.find('input, select, textarea').first();
};

const resolveSchemaFormField = (
  name: string,
  formSelector = DEFAULT_FORM_SELECTOR,
): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(formSelector).then(($form) => {
    const normalizedName = normalizeFieldName(name);

    const directField = findDataCyField($form, name);
    if (directField.length) {
      return cy.wrap(directField);
    }

    const compactField = findCompactField($form, normalizedName);
    if (compactField) {
      return cy.wrap(compactField);
    }

    const labelLinkedField = findLabelLinkedField($form, normalizedName);
    if (labelLinkedField) {
      return cy.wrap(labelLinkedField);
    }

    return cy.wrap(getFallbackField($form));
  });
};

Cypress.Commands.add(
  'injectUsernameAndPasswordIntoPocketBase',
  ({ username, password, permission }: CreateUserArgs) => {
    return cy.wrap(
      new Cypress.Promise(async (resolve, reject) => {
        try {
          await pb
            .collection('users')
            .getFirstListItem(`username="${username}"`)
            .then((existingUser) => {
              console.log('User already exists. Skipping POST.');
              resolve(existingUser);
            });
        } catch (error: any) {
          if (error.status === 404) {
            console.log('User not found. Creating new user...');
            pb.collection('users')
              .create({
                username,
                password,
                passwordConfirm: password,
                permission,
              })
              .then((newUser) => {
                resolve(newUser);
              })
              .catch(reject);
          } else {
            console.error('An error occurred:', error);
          }
        }
      }),
    );
  },
);

Cypress.Commands.add(
  'setPocketBaseAuth',
  (auth, username, password, permission) => {
    const userArgs: CreateUserArgs = {
      username: username ?? CREATE_USER_ARGS.username,
      password: password ?? CREATE_USER_ARGS.password,
      permission: permission ?? CREATE_USER_ARGS.permission,
    };
    cy.injectUsernameAndPasswordIntoPocketBase(userArgs).then((record) => {
      cy.window().then((win) => {
        const authStoreValue = {
          token: auth.token,
          record: {
            id: record.id,
            username: record.username,
            avatar: record.avatar,
            permission: record.permission,
            collectionId: record.collectionId,
            collectionName: record.collectionName,
          },
        };
        win.localStorage.setItem(
          'pocketbase_auth',
          JSON.stringify(authStoreValue),
        );
      });
    });
  },
);

Cypress.Commands.add('login', (username, password, permission) => {
  cy.fixture('auth.json').then((auth: AuthParameters) => {
    cy.setPocketBaseAuth(auth, username, password, permission);
  });
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    try {
      win.localStorage.clear();
    } catch {}
  });
  cy.visit('/login');
});

Cypress.Commands.add(
  'getByAttribute',
  (value: string, options = { isGlobal: false }) => {
    const selector =
      `[${options.attribute ?? 'data-cy'}="${value}"] ${options.extra ?? ''}`.trimEnd();
    return options.isGlobal
      ? cy.document().its('body').find(selector)
      : cy.get(selector);
  },
);

Cypress.Commands.add(
  'getSchemaFormField',
  (name: string, formSelector = DEFAULT_FORM_SELECTOR) => {
    return resolveSchemaFormField(name, formSelector);
  },
);

Cypress.Commands.add(
  'interactSchemaFormField',
  (name: string, action: (input: JQuery<HTMLElement>) => void) => {
    resolveSchemaFormField(name).then(($field) => {
      action($field);
    });
  },
);

Cypress.Commands.add(
  'interactSchemaFormInput',
  (name: string, action: (input: JQuery<HTMLElement>) => void) => {
    cy.interactSchemaFormField(name, action);
  },
);

const fillSchemaField = (
  input: JQuery<HTMLElement>,
  value: string | number,
) => {
  const fieldValue = String(value);
  const element = input[0] as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement;

  if (element instanceof HTMLSelectElement) {
    cy.wrap(input).select(fieldValue, { force: true });
  } else if (element instanceof HTMLInputElement && element.type === 'number') {
    element.value = fieldValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    cy.wrap(input).clear({ force: true }).type(fieldValue, { force: true });
  }
};

Cypress.Commands.add(
  'fillSchemaFormFields',
  (parameters: Record<string, string | number>) => {
    Object.entries(parameters).forEach(([name, value]) => {
      cy.interactSchemaFormInput(name, (input) =>
        fillSchemaField(input, value),
      );
    });
  },
);

Cypress.Commands.add(
  'inputSchemaFormParameters',
  (parameters: Record<string, string | number>) => {
    cy.fillSchemaFormFields(parameters);
  },
);

Cypress.Commands.add(
  'assertSchemaFormFieldValue',
  (name: string, value: string | number) => {
    resolveSchemaFormField(name).then(($field) => {
      cy.wrap($field).should('have.value', String(value));
    });
  },
);

Cypress.Commands.add(
  'validateSchemaFormInput',
  (name: string, value: string | number) => {
    cy.assertSchemaFormFieldValue(name, value);
  },
);

Cypress.Commands.add(
  'submitSchemaForm',
  (formSelector = DEFAULT_FORM_SELECTOR) => {
    cy.get(formSelector)
      .find('button[type="submit"], input[type="submit"]')
      .first()
      .click({ force: true });
  },
);

Cypress.Commands.add('truncateCollection', (collection: string) => {
  const truncatePromise = new Cypress.Promise((resolve, reject) => {
    (async () => {
      try {
        const records = await pb.collection(collection).getFullList();

        for (const record of records) {
          await pb.collection(collection).delete(record.id);
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    })();
  });
  return cy.wrap(truncatePromise, { log: false });
});

Cypress.Commands.add('resetCollection', (collections: string[] = []) => {
  collections.forEach((collection) => {
    cy.truncateCollection(collection);
  });
});

Cypress.Commands.add('resetDB', () => {
  const collectionsToReset = [
    'stations',
    'presets',
    'notifications',
    'decoders',
    'alerts',
    'actions',
    'leo',
    'rapha',
  ];
  cy.resetCollection(collectionsToReset);
});

Cypress.Commands.add('createMockStationServer', (args) => {
  cy.task('startMockStationServer', args);
});

Cypress.Commands.add('stopMockStationServer', (id: string) => {
  cy.task('stopMockStationServer', { id });
});

Cypress.Commands.add('stopAllMockStationServers', () => {
  cy.task('stopAllMockStationServers');
});

Cypress.Commands.add('triggerProbeAllInPocketBase', () => {
  pb.send('/api/cron/probe-all', { method: 'POST' }).then((res) => {
    expect(res.success).to.eq(true);
  });
});

Cypress.Commands.add('createDecoderId', (decoderId: string) => {
  pb.collection('decoders').create({
    decoderId: decoderId,
  });
});

Cypress.Commands.add('deleteDecoderId', (decoderId: string) => {
  const deletePromise = new Cypress.Promise((resolve, reject) => {
    (async () => {
      try {
        const records = await pb.collection('decoders').getFullList({
          filter: `decoderId = "${decoderId}"`,
        });

        for (const record of records) {
          await pb.collection('decoders').delete(record.id);
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    })();
  });
  return cy.wrap(deletePromise, { log: false });
});

export {};
