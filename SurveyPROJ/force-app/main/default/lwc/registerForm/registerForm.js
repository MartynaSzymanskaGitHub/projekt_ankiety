import { LightningElement, track } from 'lwc';
import registerUser from '@salesforce/apex/LoginController.registerUser';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class RegisterForm extends LightningElement {
  @track name = '';
  @track email = '';
  @track password = '';

  handleName(e) { this.name = e.target.value; }
  handleEmail(e) { this.email = e.target.value; }
  handlePassword(e) { this.password = e.target.value; }

  async handleRegister() {
    try {
      await registerUser({ name: this.name, email: this.email, password: this.password });
      this.dispatchEvent(new ShowToastEvent({
        title: 'Sukces',
        message: 'Zarejestrowano użytkownika.',
        variant: 'success'
      }));
      this.name = '';
      this.email = '';
      this.password = '';
    } catch (error) {
      this.dispatchEvent(new ShowToastEvent({
        title: 'Błąd',
        message: error.body?.message || error.message,
        variant: 'error'
      }));
    }
  }
}
