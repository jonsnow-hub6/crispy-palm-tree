import StationsPage from '../../support/pages/StationsPage';

describe('Stations', () => {
  const page = new StationsPage();

  beforeEach(() => {
    cy.resetDB();
    page.stopMockStationServer();
    cy.login();
    page.visit();
  });

  it('1.1.1 create a new station', () => {
    page.interceptCreateRequest();

    const stationName = 'newStation';
    const payload = {
      name: stationName,
      stationLinks: [{ host: 'localhost', port: 9090 }],
    };

    page.openCreateStationDialog();
    page.fillFields({
      name: stationName,
      host: 'localhost',
      port: '9090',
    });

    page.submitForm();
    page.assertCreateRequestPayload(payload);
  });

  it('1.1.2 loads stations from PocketBase into the stations page', () => {
    const seededStations = [
      {
        name: 'pb-seeded-station-1',
        stationLinks: [{ host: 'example-one.local', port: 8001 }],
      },
      {
        name: 'pb-seeded-station-2',
        stationLinks: [{ host: 'example-two.local', port: 8002 }],
      },
      {
        name: 'pb-seeded-station-3',
        stationLinks: [{ host: 'example-three.local', port: 8003 }],
      },
    ];

    page.seedStationsInPocketBase(seededStations);
    page.visit();

    page.getList().should('be.visible');
    page
      .getList()
      .find('[data-cy^="station-item-"]')
      .should('have.length', seededStations.length);

    seededStations.forEach(({ name, stationLinks }) => {
      page.assertStationLinkValues(name, stationLinks);
    });
  });

  it('1.1.3 connects to a mocked station, then shows a disconnect alert', () => {
    const stationName = 'mocked-station';
    page.createStationMock(stationName);

    page.assertStationVisible(stationName);

    page.stopMockStationServer();
    page.triggerStationProbe();

    page.assertDisconnectAlertVisible();
  });

  it('1.2.1 when connected to a station, GET request for current counter should work', () => {});
});
