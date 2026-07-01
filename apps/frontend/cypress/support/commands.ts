/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import { AuthParameters } from '../types';

// Custom Cypress commands

declare global {
  namespace Cypress {
    interface Cypress {
      env(key: 'POCKETBASE_USERNAME'): string;
      env(key: 'POCKETBASE_PASSWORD'): string;
    }
    interface Chainable {
      login(username?: string, password?: string): Chainable<Element>;
      logout(): Chainable<Element>;
      mockApi(): Chainable<void>;
      setPocketBaseAuth(auth: AuthParameters): Chainable<void>;
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

Cypress.Commands.add('mockApi', () => {
  // Load fixtures and set up common intercepts for PocketBase endpoints
  cy.fixture('auth.json').then((auth) => {
    // Auth endpoint
    cy.intercept(
      'POST',
      '**/api/collections/users/auth-with-password',
      (req) => {
        req.reply({ statusCode: 200, body: auth });
      },
    );
    // user record fetches
    cy.intercept('GET', '**/api/collections/users/*', (req) => {
      req.reply({ statusCode: 200, body: auth.record });
    });
  });

  cy.fixture('presets.json').then((presets) => {
    cy.intercept('GET', '**/api/collections/presets/records*', (req) => {
      req.reply({ statusCode: 200, body: presets });
    });
  });

  cy.intercept('GET', '**/api/collections/**/subscribe*', {
    statusCode: 200,
    body: {},
  });
});

Cypress.Commands.add('setPocketBaseAuth', (auth) => {
  cy.window().then((win) => {
    const authStoreValue = {
      token: auth.token,
      record: auth.record,
    };
    win.localStorage.setItem('pocketbase_auth', JSON.stringify(authStoreValue));
  });
});

Cypress.Commands.add('login', () => {
  // Directly seed the PocketBase auth store for stable authenticated tests
  cy.fixture('auth.json').then((auth: AuthParameters) => {
    cy.setPocketBaseAuth(auth);
  });
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    try {
      win.localStorage.clear();
    } catch {
      // ignore
    }
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
  const email = Cypress.env('POCKETBASE_USERNAME');
  const password = Cypress.env('POCKETBASE_PASSWORD');

  cy.request(
    'POST',
    'http://127.0.0.1:8090/api/collections/_superusers/auth-with-password',
    {
      identity: email,
      password: password,
    },
  ).then(({ body }) => {
    cy.request({
      method: 'DELETE',
      url: `http://127.0.0.1:8090/api/collections/${collection}/truncate`,
      headers: {
        Authorization: `Bearer ${body.token}`,
      },
    });
  });
});

Cypress.Commands.add('resetCollection', (collections: string[] = []) => {
  collections.forEach((collection) => {
    cy.truncateCollection(collection);
  });
});

Cypress.Commands.add('resetDB', () => {
  const collectionsToReset = ['stations', 'presets', 'notifications'];
  cy.resetCollection(collectionsToReset);
});

export {};
