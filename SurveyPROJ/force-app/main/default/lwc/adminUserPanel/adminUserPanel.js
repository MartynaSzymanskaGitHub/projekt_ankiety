import { LightningElement, track, wire } from 'lwc';
import getAllUsers from '@salesforce/apex/AdminUserPanelController.getAllUsers';
import updateUserStatus from '@salesforce/apex/AdminUserPanelController.updateUserStatus';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const COLUMNS = [
  { label: 'Imię i nazwisko', fieldName: 'Name', type: 'text' },
  { label: 'Email', fieldName: 'Email__c', type: 'email' },
  { label: 'Rola', fieldName: 'Role__c', type: 'text' },
  { 
    label: 'Aktywne konto', 
    fieldName: 'Is_Active__c', 
    type: 'boolean',
    editable: true 
  }
];

export default class AdminUserPanel extends LightningElement {
  @track users = [];
  @track error;
  @track isLoading = true;
  @track draftValues = [];

  columns = COLUMNS;

  connectedCallback() {
    const userData = localStorage.getItem('user');
    if (!userData) {
      this.logoutAndRedirect();
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (user.Role__c !== 'Admin') {
        alert('You do not have permission to access this page. You have been logged out.');
        this.logoutAndRedirect();
      }
    } catch (e) {
      console.error('Error parsing localStorage:', e);
      alert('An error occurred. You have been logged out.');
      this.logoutAndRedirect();
    }
  }

  logoutAndRedirect() {
    localStorage.removeItem('user');
    window.location.href = '/lightning/n/Login';
  }

  @wire(getAllUsers)
  wiredUsers({ error, data }) {
    this.isLoading = false;
    if (data) {
      this.users = data;
      this.error = undefined;
    } else if (error) {
      this.error = error.body.message;
    }
  }

  handleSave(event) {
    const draftValues = event.detail.draftValues;

    const updates = draftValues.map(row =>
      updateUserStatus({ userId: row.Id, isActive: row.Is_Active__c })
    );

    Promise.all(updates)
      .then(() => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Sukces',
            message: 'Zaktualizowano status konta.',
            variant: 'success'
          })
        );
        return getAllUsers();
      })
      .then(data => {
        this.users = data;
        this.draftValues = [];
      })
      .catch(error => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Błąd',
            message: error.body?.message || error.message,
            variant: 'error'
          })
        );
      });
  }
}
