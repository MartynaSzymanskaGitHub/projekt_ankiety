import { LightningElement } from 'lwc';

export default class LogoutButton extends LightningElement {
  handleLogout() {
    localStorage.removeItem('user');
    window.location.href = '/lightning/n/Login';
  }
}
