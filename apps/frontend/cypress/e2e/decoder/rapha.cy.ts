import { DecoderPage } from '../../support/pages/DecoderPage';
import {
  PLL_LOCK_STATE_0_PACKET,
  PLL_LOCK_STATE_1_PACKET,
  VALID_DECODER_ID,
} from './consts';

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
    decoderPage.assertDecoderIsLoaded();
    decoderPage.getPllGraphElement().then(($parent) => {
      const originalGraph = $parent.html();

      for (let i: number = 0; i < 10; i++) {
        decoderPage.injectDecoderRecords('rapha', [
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
    decoderPage.assertDecoderIsLoaded();

    const timeWhenInjecting = new Date();

    decoderPage.injectDecoderRecords('rapha', [PLL_LOCK_STATE_1_PACKET]);

    decoderPage
      .getDecoderPllLockStateValues('locked-percentage', '100')
      .should('equal', '100');

    decoderPage.getDecoderPllLockStateValues('last-locked').then((value) => {
      decoderPage.assertLastLockedValueAndExpectedTimeAreClose(
        timeWhenInjecting,
        value,
        30,
      );
    });

    decoderPage.injectDecoderRecords('rapha', [PLL_LOCK_STATE_0_PACKET]);

    decoderPage
      .getDecoderPllLockStateValues('locked-percentage', '50')
      .should('equal', '50');
  });

  it('4.2.3 - when injecting into the pll 0 then 1, should show 0 locked then jump to 50, last locked time should match', () => {
    decoderPage.assertDecoderIsLoaded();

    decoderPage.injectDecoderRecords('rapha', [PLL_LOCK_STATE_0_PACKET]);

    decoderPage
      .getDecoderPllLockStateValues('locked-percentage', '0')
      .should('equal', '0');

    const timeWhenInjecting = new Date();

    decoderPage.injectDecoderRecords('rapha', [PLL_LOCK_STATE_1_PACKET]);

    decoderPage
      .getDecoderPllLockStateValues('locked-percentage', '50')
      .should('equal', '50');

    decoderPage.getDecoderPllLockStateValues('last-locked').then((value) => {
      decoderPage.assertLastLockedValueAndExpectedTimeAreClose(
        timeWhenInjecting,
        value,
        20,
      );
    });
  });
});
