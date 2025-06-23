import { LightningElement, track } from 'lwc';
import saveCategory         from '@salesforce/apex/CategoryController.saveCategory';
import updateCategory       from '@salesforce/apex/CategoryController.updateCategory';
import getAllCategories     from '@salesforce/apex/CategoryController.getAllCategories';
import deleteCategory       from '@salesforce/apex/CategoryController.deleteCategory';
import getAllUserLogins     from '@salesforce/apex/CategoryController.getAllUserLogins';
import getAssignedUserIds   from '@salesforce/apex/CategoryController.getAssignedUserIds';
import { ShowToastEvent }   from 'lightning/platformShowToastEvent';

export default class CategoryCreator extends LightningElement {
  @track allCategories = [];
  @track categories = [];
  @track userOptions = [];

  @track categoryId = null;
  @track categoryName = '';
  @track selectedUsers = [];
  @track searchTerm = '';

  connectedCallback() {
     this.verifyAccess();
    this.refreshCategories();
    this.loadUsers();
  }
  
  verifyAccess() {
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
      console.error('Error parsing user data:', e);
      alert('An error occurred. You have been logged out.');
      this.logoutAndRedirect();
    }
  }

  logoutAndRedirect() {
    localStorage.removeItem('user');
    window.location.href = '/lightning/n/Login';
  }


  get cardTitle() {
    return this.categoryId ? 'Edytuj oddział' : 'Dodaj oddział';
  }

  get saveLabel() {
    return this.categoryId ? 'Zapisz zmiany' : 'Zapisz';
  }

  get disableSave() {
    return !this.categoryName || this.selectedUsers.length === 0;
  }

  handleNameChange(e) {
    this.categoryName = e.target.value;
  }

  handleUserChange(e) {
    this.selectedUsers = e.detail.value;
  }

  handleSave() {
    const params = {
      name: this.categoryName,
      userLoginIds: this.selectedUsers
    };
    let action = this.categoryId ? updateCategory : saveCategory;
    if (this.categoryId) params.catId = this.categoryId;

    action(params)
      .then(() => {
        this.toast('Sukces', this.categoryId ? 'Updated departament' : 'Added', 'success');
        this.resetForm();
        this.refreshCategories();
      })
      .catch(err => this.toast('Error', err.body?.message || err.message, 'error'));
  }

  handleEdit(e) {
    const id = e.currentTarget.dataset.id;
    const rec = this.categories.find(c => c.Id === id);
    this.categoryId = rec.Id;
    this.categoryName = rec.Name;
    getAssignedUserIds({ catId: id })
      .then(ids => {
        this.selectedUsers = ids;
      })
      .catch(() => {
        this.toast('Error', 'Error loading users', 'error');
      });
  }

  handleDelete(e) {
    deleteCategory({ catId: e.currentTarget.dataset.id })
      .then(() => {
        this.toast('Sukces', 'Deleted', 'success');
        this.refreshCategories();
      })
      .catch(err => this.toast('Error', err.body?.message || err.message, 'error'));
  }

  resetForm() {
    this.categoryId = null;
    this.categoryName = '';
    this.selectedUsers = [];
  }

  refreshCategories() {
    getAllCategories()
      .then(data => {
        this.allCategories = data;
        this.applyFilter();
      });
  }

  loadUsers() {
    getAllUserLogins()
      .then(users => {
        this.userOptions = users.map(x => ({ label: x.Name, value: x.Id }));
      });
  }

  handleSearchChange(e) {
    this.searchTerm = e.target.value;
    this.applyFilter();
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.categories = this.allCategories.filter(c =>
      c.Name?.toLowerCase().includes(term)
    );
  }

  toast(title, msg, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message: msg, variant }));
  }
}
