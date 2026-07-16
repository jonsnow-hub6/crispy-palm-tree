import { DecoderPage } from '../../support/pages/DecoderPage';
import { VALID_DECODER_ID } from './consts';

describe('Decoder - Rapha', () => {
  const decoderPage = new DecoderPage();

  beforeEach(() => {
    cy.resetDB();
    cy.deleteDecoderId(VALID_DECODER_ID);
    cy.createDecoderId(VALID_DECODER_ID);
    cy.login();
    decoderPage.visit();
  });

  it('4.2.1 - when receiving pll packets, should show change in graph', () => {
    decoderPage.getPllGraphElement().then(($parent) => {
      const originalGraph = $parent.html();

      for (let i: number = 0; i < 10; i++) {
        decoderPage.injectRaphaRecords([
          {
            name: 'pllLockState',
            parameters: {
              pllLockState: Math.random() > 0.5 ? 1 : 0,
            },
            decoderId: VALID_DECODER_ID,
          },
        ]);
      }

      decoderPage.getPllGraphElement().should(($updatedParent) => {
        expect($updatedParent.html()).not.to.eq(originalGraph);
      });
    });
  });

  it('4.2.2 - when injecting into the pll 1 then 0, should show 100% locked then slightly reduce with time, last locked time should match', () => {
    const timeWhenInjecting = new Date();
    cy.wait(1500).then(() => {
      decoderPage
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
        ])
        .then(() => {
          cy.wait(3000).then(() => {
            decoderPage
              .getDecoderPllLockStateValues('last-locked')
              .then((value) => {
                expect(
                  decoderPage.assertLastLockedValueAndExpectedTimeAreClose(
                    timeWhenInjecting,
                    value,
                    20,
                  ),
                );
              });
            decoderPage
              .getDecoderPllLockStateValues('locked-percentage')
              .then((value) => {
                expect(value).to.equal('100');
              });
          });
        });

      decoderPage
        .injectRaphaRecords([
          {
            name: 'pllLockState',
            parameters: {
              pllLockState: 0,
            },
            decoderId: VALID_DECODER_ID,
          },
          {
            name: 'pllLockState',
            parameters: {
              pllLockState: 0,
            },
            decoderId: VALID_DECODER_ID,
          },
        ])
        .then(() => {
          cy.wait(3000).then(() => {
            decoderPage
              .getDecoderPllLockStateValues('last-locked')
              .then((value) => {
                expect(
                  decoderPage.assertLastLockedValueAndExpectedTimeAreClose(
                    timeWhenInjecting,
                    value,
                    20,
                  ),
                );
              });
            decoderPage
              .getDecoderPllLockStateValues('locked-percentage')
              .then((value) => {
                expect(value).to.equal('50');
              });
          });
        });
    });
  });

  it('4.2.3 - when injecting into the pll 0 then 1, should show 0 locked then jump to 50, last locked time should match', () => {
    const timeWhenInjecting = new Date();
    cy.wait(1500).then(() => {
      decoderPage
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
          cy.wait(3000).then(() => {
            decoderPage
              .getDecoderPllLockStateValues('locked-percentage')
              .then((value) => {
                expect(value).to.equal('0');
              });
          });
        });

      decoderPage
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
          cy.wait(3000).then(() => {
            decoderPage
              .getDecoderPllLockStateValues('last-locked')
              .then((value) => {
                expect(
                  decoderPage.assertLastLockedValueAndExpectedTimeAreClose(
                    timeWhenInjecting,
                    value,
                    20,
                  ),
                );
              });
            decoderPage
              .getDecoderPllLockStateValues('locked-percentage')
              .then((value) => {
                expect(value).to.equal('50');
              });
          });
        });
    });
  });
});
