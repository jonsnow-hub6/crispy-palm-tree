import { AppPage } from '../abstract/page';
import { pb } from '../consts';
import { LeoRecord, RaphaRecord } from '../types';
import { areTimesClose } from '../utils/utils';
import { DEFAULT_LEO_RECORD_VALUES } from './consts';

interface GetLeoLogParams {
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
    regex?: RegExp,
  ) {
    const selector = `[data-cy=${label}]`;
    const attrName = `data-${label.toLowerCase()}`;

    return cy.get(selector, { timeout: 10000 }).then(($el) => {
      const value = $el.attr(attrName);

      expect(value, `${label} attribute`).to.not.equal(undefined);

      if (regex) {
        expect(value!, `${label} value`).to.match(regex);
      }

      return value!;
    });
  }

  assertLastLockedValueAndExpectedTimeAreClose(
    expectedTime: Date,
    lastLocked: string,
    differenceInSecond: number,
  ) {
    const lastLockedDate = new Date();

    const [hours, minutes, seconds] = lastLocked.split(':').map(Number);

    lastLockedDate.setHours(hours, minutes, seconds, 0);
    expect(
      areTimesClose(expectedTime, lastLockedDate, differenceInSecond),
    ).to.equal(true);
  }
}
