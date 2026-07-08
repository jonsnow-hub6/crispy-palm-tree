import { DecoderPage } from '../../support/pages/DecoderPage';
import { VALID_DECODER_ID } from './consts';

describe('Decoder - Rapha', () => {
  const page = new DecoderPage();

  beforeEach(() => {
    cy.resetDB();
    cy.deleteDecoderId(VALID_DECODER_ID);
    cy.createDecoderId(VALID_DECODER_ID);
    cy.stopAllMockStationServers();
    cy.login();
    page.visit();
  });

  it('4.2.1 - when receiving pll packets, should show change in graph', () => {
    page.getPllGraphElement().then(($parent) => {
      // 1. Capture the initial snapshot of the entire inner DOM tree
      const originalGraph = $parent.html();

      // 2. Perform the action that triggers the deep change
      for (let i: number = 0; i < 10; i++) {
        page.injectRaphaRecords([
          {
            name: 'pllLockState',
            parameters: {
              pllLockState: Math.random() > 0.5 ? 1 : 0,
            },
            decoderId: VALID_DECODER_ID,
          },
        ]);
      }

      // 3. Assert that the current DOM tree no longer matches the snapshot
      page.getPllGraphElement().should(($updatedParent) => {
        expect($updatedParent.html()).not.to.eq(originalGraph);
      });
    });
  });

  it('4.2.2 - when injecting into the pll 1 then 0, should show 100% locked then slightly reduce with time, last locked time should match', () => {
    const time1 = new Date();

    page
      .injectRaphaRecords([
        {
          name: 'pllLockState',
          parameters: {
            pllLockState: 1,
          },
          decoderId: VALID_DECODER_ID,
        },
        {
          name: 'pllLockState',
          parameters: {
            pllLockState: 1,
          },
          decoderId: VALID_DECODER_ID,
        },
        {
          name: 'pllLockState',
          parameters: {
            pllLockState: 1,
          },
          decoderId: VALID_DECODER_ID,
        },
      ])
      .then(() => {
        cy.wait(2000).then(() => {
          page.getLockedValues('last-locked').then((value) => {
            expect(page.assertLastLockedValueAndDateAreClose(time1, value, 20));
          });
          page.getLockedValues('locked-percentage').then((value) => {
            expect(value).to.equal('100');
          });
        });
      });
  });

  it.only('4.2.3 - when injecting into the pll 0 then 1, should show 0 locked then jump to 100, last locked time should match', () => {
    const time1 = new Date();

    page
      .injectRaphaRecords([
        {
          name: 'pllLockState',
          parameters: {
            pllLockState: 0,
          },
          decoderId: VALID_DECODER_ID,
        },
      ])
      .then(() => {
        cy.wait(2000).then(() => {
          page.getLockedValues('locked-percentage').then((value) => {
            expect(value).to.equal('0');
          });
        });
      });

    page
      .injectRaphaRecords([
        {
          name: 'pllLockState',
          parameters: {
            pllLockState: 1,
          },
          decoderId: VALID_DECODER_ID,
        },
      ])
      .then(() => {
        cy.wait(2000).then(() => {
          page.getLockedValues('last-locked').then((value) => {
            expect(page.assertLastLockedValueAndDateAreClose(time1, value, 20));
          });
          page.getLockedValues('locked-percentage').then((value) => {
            expect(value).to.equal('100');
          });
        });
      });
  });
});
