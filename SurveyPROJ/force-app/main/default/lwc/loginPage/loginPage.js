import { LightningElement } from 'lwc';
import login from '@salesforce/apex/LoginController.login';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class LoginPage extends LightningElement {
  username = '';
  password = '';

  handleUsernameChange(e) {
    this.username = e.target.value;
  }

  handlePasswordChange(e) {
    this.password = e.target.value;
  }

  handleLogin() {
    login({ username: this.username, password: this.password })
      .then(user => {
        delete user.Password__c;
        localStorage.setItem('user', JSON.stringify(user));
        this.dispatchEvent(new ShowToastEvent({
          title: 'Logged succesfully',
          message: `Welcome, ${user.Name}`,
          variant: 'success'
        }));
        window.location.href = '/lightning/n/SurveyResultsPage';
      })
      .catch(error => {
        this.dispatchEvent(new ShowToastEvent({
          title: 'Error loading',
          message: error.body?.message || error.message,
          variant: 'error'
        }));
      });
  }
}
