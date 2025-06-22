import { LightningElement, track, wire } from 'lwc';
import getAllUsers from '@salesforce/apex/AdminUserPanelController.getAllUsers';
import updateUserStatus from '@salesforce/apex/AdminUserPanelController.updateUserStatus';
import updateUserRole from '@salesforce/apex/AdminUserPanelController.updateUserRole';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'Admin' },
  { label: 'User', value: 'User' }
];

export default class AdminUserPanel extends LightningElement {
  @track users = [];
  @track error;
  @track isLoading = true;
  @track draftValues = [];

  columns = [
    { label: 'Imię i nazwisko', fieldName: 'Name', type: 'text' },
    { label: 'Email', fieldName: 'Email__c', type: 'email' },
    {
      label: 'Rola',
      fieldName: 'Role__c',
      type: 'picklist',
      editable: true,
      typeAttributes: {
        placeholder: 'Wybierz rolę',
        options: ROLE_OPTIONS,
        value: { fieldName: 'Role__c' },
        context: { fieldName: 'Id' }
      }
    },
    {
      label: 'Aktywne konto',
      fieldName: 'Is_Active__c',
      type: 'boolean',
      editable: true
    }
  ];

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

  const updates = draftValues.map(row => {
    const promises = [];

    if ('Is_Active__c' in row) {
      promises.push(updateUserStatus({ userId: row.Id, isActive: row.Is_Active__c }));
    }

    if ('Role__c' in row) {
      promises.push(updateUserRole({ userId: row.Id, role: row.Role__c }));
    }

    return Promise.all(promises);
  });

  Promise.all(updates.flat())
    .then(() => {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Sukces',
          message: 'Zaktualizowano dane użytkowników.',
          variant: 'success'
        })
      );

      window.location.reload();
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


  refreshUserList() {
    this.isLoading = true;
    getAllUsers()
      .then(data => {
        this.users = data;
        this.draftValues = [];
        this.error = undefined;
        this.isLoading = false;
      })
      .catch(error => {
        this.error = error.body?.message || error.message;
        this.isLoading = false;
      });
  }
}
