export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  fillUsername(value: string) {
    cy.get('[data-cy=username-input]').clear().type(value);
  }

  fillPassword(value: string) {
    cy.get('[data-cy=password-input]').clear().type(value);
  }

  submit() {
    cy.get('[data-cy=login-btn]').click();
  }

  getError() {
    return cy.get('[data-cy=login-error]');
  }
}

export default LoginPage;
