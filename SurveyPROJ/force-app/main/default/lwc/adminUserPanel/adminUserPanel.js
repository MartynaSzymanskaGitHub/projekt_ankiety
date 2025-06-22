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
  @track filteredUsers = [];
  @track error;
  @track isLoading = true;
  @track draftValues = [];
  @track searchKey = '';
  @track sortBy = 'Name';
  @track sortDirection = 'asc';

  columns = [
    { label: 'Full Name', fieldName: 'Name', type: 'text', sortable: true },
    { label: 'Email', fieldName: 'Email__c', type: 'email' },
    {
      label: 'Role',
      fieldName: 'Role__c',
      type: 'picklist',
      editable: true,
      typeAttributes: {
        placeholder: 'Select role',
        options: ROLE_OPTIONS,
        value: { fieldName: 'Role__c' },
        context: { fieldName: 'Id' }
      }
    },
    {
      label: 'Active Account',
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
      this.applySearchAndSort();
    } else if (error) {
      this.error = error.body?.message || error.message;
    }
  }

  handleSearchChange(event) {
    this.searchKey = event.target.value.toLowerCase();
    this.applySearchAndSort();
  }

  handleSort(event) {
    this.sortBy = event.detail.fieldName;
    this.sortDirection = event.detail.sortDirection;
    this.applySearchAndSort();
  }

  applySearchAndSort() {
    let filtered = this.users.filter(u =>
      u.Name?.toLowerCase().includes(this.searchKey)
    );

    filtered.sort((a, b) => {
      const valA = a[this.sortBy] || '';
      const valB = b[this.sortBy] || '';
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredUsers = filtered;
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
            title: 'Success',
            message: 'User records have been updated.',
            variant: 'success'
          })
        );
        return getAllUsers();
      })
      .then(data => {
        this.users = data;
        this.draftValues = [];
        this.applySearchAndSort();
      })
      .catch(error => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error',
            message: error.body?.message || error.message,
            variant: 'error'
          })
        );
      });
  }
}
