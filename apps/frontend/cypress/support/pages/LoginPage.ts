import { AppPage } from '../abstract/page';

export class LoginPage implements AppPage {
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

  getErrorMessage() {
    return cy.get('[data-cy=login-error]');
  }

  login(username: string, password: string) {
    this.fillUsername(username);
    this.fillPassword(password);
    this.submit();
    this.getErrorMessage().should('exist');
  }
}

export default LoginPage;
