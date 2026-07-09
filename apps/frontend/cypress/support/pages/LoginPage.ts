export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  fillUsername(username: string) {
    cy.get('[data-cy=username-input]').clear().type(username);
  }

  fillPassword(password: string) {
    cy.get('[data-cy=password-input]').clear().type(password);
  }

  submit() {
    cy.get('[data-cy=login-btn]').click();
  }

  getError() {
    return cy.get('[data-cy=login-error]');
  }
}

export default LoginPage;
