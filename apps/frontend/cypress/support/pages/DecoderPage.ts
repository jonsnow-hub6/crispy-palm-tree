import { AppPage } from '../abstract/page';
import { pb } from '../consts';
import { LeoRecord, RaphaRecord } from '../types';
import { dateToSeconds, timeToSeconds } from '../utils/utils';
import { DEFAULT_LEO_RECORD_VALUES } from './consts';
import {
  DecoderRecordName,
  DecoderRecordTypes,
  GetLeoLogParams,
} from './types';

export class DecoderPage implements AppPage {
  visit() {
    cy.visit('/decoder');
  }

  private injectSingleRaphaRecord(record: Partial<RaphaRecord>) {
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

  injectDecoderRecords<T extends DecoderRecordName>(
    recordType: T,
    records: Partial<DecoderRecordTypes[T]>[],
    delay: number = 500,
  ) {
    const recordTypeToInjectMap = {
      leo: this.injectSingleLeoRecord,
      rapha: this.injectSingleRaphaRecord,
    };

    return cy.wrap(
      Cypress.Promise.all(
        records.map(async (record) => {
          return await new Cypress.Promise((resolve) => {
            cy.wait(delay).then(() => {
              recordTypeToInjectMap[recordType].call(this, record);
              resolve();
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
    const actualTime = this.parseLastLockedTime(lastLocked);
    const expectedSeconds = dateToSeconds(expectedTime);
    const actualSeconds = timeToSeconds(actualTime);

    let difference = Math.abs(expectedSeconds - actualSeconds);

    // Handle crossing midnight
    if (difference > 12 * 3600) {
      difference = 24 * 3600 - difference;
    }

    expect(difference).to.be.at.most(differenceInSecond);
  }

  private parseLastLockedTime(lastLocked: string): {
    hours: number;
    minutes: number;
    seconds: number;
  } {
    const match = lastLocked
      .trim()
      .match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\s?(AM|PM))?$/i);

    expect(match, `invalid last locked value: ${lastLocked}`).to.not.equal(
      null,
    );

    const [, hours, minutes, seconds, meridiem] = match!;

    let parsedHours = Number(hours);

    if (meridiem) {
      const period = meridiem.toUpperCase();

      if (period === 'PM' && parsedHours !== 12) {
        parsedHours += 12;
      }

      if (period === 'AM' && parsedHours === 12) {
        parsedHours = 0;
      }
    }

    return {
      hours: parsedHours,
      minutes: Number(minutes),
      seconds: Number(seconds),
    };
  }

  assertDecoderIsLoaded() {
    const label = 'selected-decoder';
    const selector = `[data-cy=${label}]`;
    const attrName = `data-${label.toLowerCase()}`;

    return cy.get(selector, { timeout: 3000 }).should('have.attr', attrName);
  }
}
