import { LeoRecord } from '../types';

export class DecoderPage {
  visit() {
    cy.visit('/decoder');
  }

  injectLeoRecord(record: Partial<LeoRecord>) {
    return cy
      .request({
        method: 'POST',
        url: 'http://127.0.0.1:8090/api/collections/_superusers/auth-with-password',
        body: {
          identity: Cypress.env('POCKETBASE_USERNAME'),
          password: Cypress.env('POCKETBASE_PASSWORD'),
        },
      })
      .then(({ body }) => {
        const token = body.token;
        cy.request({
          method: 'POST',
          url: 'http://127.0.0.1:8090/api/collections/leo/records',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: {
            projectId: record.projectId || '1234',
            counter: record.counter ?? 0,
            magic: record.magic ?? 12345678,
            payload: record.payload || '0x00000000000001',
            timeOfArrival: record.timeOfArrival || new Date().toISOString(),
            reserved: record.reserved || '0x00000000000001',
            messageType: record.messageType ?? 1,
            management: record.management ?? 1,
            threshold: record.threshold ?? 1,
            decoderId: record.decoderId || 'decoder1',
          },
        });
      });
  }

  injectRaphaRecord(
    name: string,
    parameters: Record<string, any>,
    decoderId: string = 'decoder2',
  ) {
    cy.request({
      method: 'POST',
      url: 'http://127.0.0.1:8090/api/collections/_superusers/auth-with-password',
      body: {
        identity: Cypress.env('POCKETBASE_USERNAME'),
        password: Cypress.env('POCKETBASE_PASSWORD'),
      },
    }).then(({ body }) => {
      const token = body.token;
      cy.request({
        method: 'POST',
        url: 'http://127.0.0.1:8090/api/collections/rapha/records',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          name,
          parameters,
          decoderId,
        },
      });
    });
  }
}
