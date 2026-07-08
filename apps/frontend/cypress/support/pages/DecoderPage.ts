import { pb } from '../consts';
import { LeoRecord, RaphaRecord } from '../types';
import { areTimesClose } from '../utils/utils';

export class DecoderPage {
  visit() {
    cy.visit('/decoder');
  }

  private injectSingleRaphaRecord(record: RaphaRecord) {
    return new Cypress.Promise((resolve, reject) => {
      try {
        pb.collection('rapha')
          .create(
            {
              name: record.name,
              parameters: record.parameters,
              decoderId: record.decoderId ?? 'decoder2',
            },
            {
              $autoCancel: false,
            },
          )
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
            projectId: record.projectId || '1234',
            counter: record.counter ?? 0,
            magic: record.magic ?? 12345678,
            payload: record.payload ?? '0x00000000000001',
            timeOfArrival: record.timeOfArrival || new Date().toISOString(),
            reserved: record.reserved ?? '0x00000000000001',
            messageType: record.messageType ?? 1,
            management: record.management ?? 1,
            threshold: record.threshold ?? 1,
            decoderId: record.decoderId ?? 'decoder2',
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

  getLeoLogValue(
    index: number,
    // stationName: string,
    // { host, port }: StationLink,
    label: string,
    regex?: RegExp,
  ): Cypress.Chainable<string> {
    const linkSelector = `[data-cy="leo-log"]`;
    const attrName = `data-${label.toLowerCase()}`;

    return cy
      .get(linkSelector, { timeout: 10000 })
      .eq(index)
      .then(($el) => {
        const value = $el.attr(attrName);

        expect(value, `${label} attribute`).to.not.equal(undefined);

        if (regex) {
          expect(value!, `${label} value`).to.match(regex);
        }

        return value!;
      });
  }

  insertLoggerValue(label: 'magic' | 'delta', input: number) {
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

  // data-locked-percentage={percentage}              data-last-locked={lastOneLabel}
  getLockedValues(label: 'locked-percentage' | 'last-locked', regex?: RegExp) {
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

  assertLastLockedValueAndDateAreClose(
    date: Date,
    lastLocked: string,
    differenceInSecond: number,
  ) {
    const lastLockedDate = new Date();

    // 2. Split the time string into [hours, minutes, seconds]
    const [hours, minutes, seconds] = lastLocked.split(':').map(Number);

    // 3. Update today's date object with the new time
    lastLockedDate.setHours(hours, minutes, seconds, 0);
    expect(areTimesClose(date, lastLockedDate, differenceInSecond)).to.equal(
      true,
    );
  }
}
