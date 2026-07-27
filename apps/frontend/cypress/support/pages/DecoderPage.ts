import { AppPage } from '../abstract/page';
import { pb } from '../consts';
import { LeoRecord, RaphaRecord } from '../types';
import { DEFAULT_LEO_RECORD_VALUES } from './consts';

export interface GetLeoLogParams {
  index: number;
  field: 'status' | 'magic-mismatch';
  regex?: RegExp;
}

export class DecoderPage implements AppPage {
  visit() {
    cy.visit('/decoder');
  }

  private injectSingleRaphaRecord(record: RaphaRecord) {
    return new Cypress.Promise((resolve, reject) => {
      try {
        pb.collection('rapha')
          .create(record, {
            $autoCancel: false,
          })
          .then(resolve)
          .catch(reject);
      } catch (err) {
        console.log(err);
      }
    });
  }
  private injectSingleLeoRecord(record: Partial<LeoRecord>) {
    return new Cypress.Promise(async (resolve, reject) => {
      try {
        pb.collection('leo')
          .create({
            ...DEFAULT_LEO_RECORD_VALUES,
            ...record,
          })
          .then(resolve)
          .catch(reject);
      } catch (err) {
        console.log(err);
      }
    });
  }

  injectRaphaRecords(records: RaphaRecord[], delay: number = 500) {
    return cy.wrap(
      Cypress.Promise.all(
        records.map(async (record) => {
          return await new Cypress.Promise((resolve) => {
            cy.wait(delay).then(() => {
              this.injectSingleRaphaRecord(record).then(() => {
                resolve();
              });
            });
          });
        }),
      ),
    );
  }

  injectLeoRecords(records: Partial<LeoRecord>[], delay: number = 500) {
    return cy.wrap(
      Cypress.Promise.all(
        records.map(async (record) => {
          return await new Cypress.Promise((resolve) => {
            cy.wait(delay).then(() => {
              this.injectSingleLeoRecord(record).then(() => {
                resolve();
              });
            });
          });
        }),
      ),
    );
  }

  getLeoLogFieldValue({
    index,
    field,
    regex,
  }: GetLeoLogParams): Cypress.Chainable<string> {
    const logSelector = `[data-cy="leo-log"]`;
    const attrName = `data-${field.toLowerCase()}`;

    return cy
      .get(logSelector, { timeout: 10000 })
      .eq(index)
      .then(($el) => {
        const value = $el.attr(attrName);

        expect(value, `${field} attribute`).to.not.equal(undefined);

        if (regex) {
          expect(value!, `${field} value`).to.match(regex);
        }

        return value!;
      });
  }

  changeLeoLoggerSettings(label: 'magic' | 'delta', input: number) {
    const inputSelector = `[data-cy=schema-form-field-${label}]`;
    cy.get(inputSelector, { timeout: 5000 }).should('exist');
    cy.wait(1000);
    cy.get(inputSelector, { timeout: 5000 })
      .click()
      .clear()
      .type(String(input), { delay: 100 })
      .blur({ force: true });
  }

  getPllGraphElement() {
    return cy.get('[data-cy=pll-graph]');
  }

  getDecoderPllLockStateValues(
    label: 'locked-percentage' | 'last-locked',
    expectedValue?: string,
  ) {
    const selector = `[data-cy=${label}]`;
    const attrName = `data-${label.toLowerCase()}`;

    return cy
      .get(selector, { timeout: 10000 })
      .should(($el) => {
        const value = $el.attr(attrName);

        expect(value, `${label} attribute`).to.not.equal(undefined);

        if (expectedValue !== undefined) {
          expect(value, `${label} value`).to.equal(expectedValue);
        }
      })
      .then(($el) => {
        return $el.attr(attrName)!;
      });
  }

  assertLastLockedValueAndExpectedTimeAreClose(
    expectedTime: Date,
    lastLocked: string,
    differenceInSecond: number,
  ) {
    expect(lastLocked, 'last locked value should exist').to.be.a('string');

    const parts = lastLocked.split(':').map(Number);

    expect(parts.length, `invalid last locked value: ${lastLocked}`).to.equal(
      3,
    );
    expect(
      parts.every((part) => !Number.isNaN(part)),
      `invalid last locked value: ${lastLocked}`,
    ).to.equal(true);

    const [hours, minutes, seconds] = parts;

    const expectedSeconds =
      expectedTime.getHours() * 3600 +
      expectedTime.getMinutes() * 60 +
      expectedTime.getSeconds();

    const actualSeconds = hours * 3600 + minutes * 60 + seconds;

    let difference = Math.abs(expectedSeconds - actualSeconds);
    console.dir();
    // Handle crossing midnight
    if (difference > 12 * 3600) {
      difference = 24 * 3600 - difference;
    }

    expect(difference).to.be.at.most(differenceInSecond);
  }

  assertDecoderIsLoaded() {
    const label = 'selected-decoder';
    const selector = `[data-cy=${label}]`;
    const attrName = `data-${label.toLowerCase()}`;

    return cy.get(selector, { timeout: 3000 }).should('have.attr', attrName);
  }
}
