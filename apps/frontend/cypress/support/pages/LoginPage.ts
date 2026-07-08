import { pb } from '../consts';

export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  injectValidUsernameAndPasswordToPocketBase(
    username: string,
    password: string,
  ) {
    return cy.wrap(
      new Cypress.Promise((resolve, reject) => {
        try {
          pb.collection('users').getFirstListItem(`username="${username}"`);
          console.log('User already exists. Skipping POST.');
          resolve();
        } catch (error: any) {
          if (error.status === 404) {
            console.log('User not found. Creating new user...');
            pb.collection('users')
              .create({
                username,
                password,
                passwordConfirm: password,
              })
              .then(resolve)
              .catch(reject);
          } else {
            console.error('An error occurred:', error);
          }
        }
      }),
    );
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
