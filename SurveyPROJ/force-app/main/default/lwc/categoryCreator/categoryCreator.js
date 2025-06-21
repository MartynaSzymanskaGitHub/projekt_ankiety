import { LightningElement, track } from 'lwc';
import saveCategory     from '@salesforce/apex/CategoryController.saveCategory';
import getAllCategories from '@salesforce/apex/CategoryController.getAllCategories';
import deleteCategory   from '@salesforce/apex/CategoryController.deleteCategory';
import getAllUserLogins from '@salesforce/apex/CategoryController.getAllUserLogins';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CategoryCreator extends LightningElement {
  @track categoryName    = '';
  @track selectedUsers   = [];

  @track categories      = [];
  @track userOptions     = [];

  isAuthorized = false;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role__c !== 'Admin') {
      alert('Unauthorized role. Sending to loading page...');
      localStorage.removeItem('user');
      window.location.href = '/lightning/n/Login';
      return;
    }
    this.isAuthorized = true;
    this.refreshCategories();
    this.loadUsers();
  }

  handleNameChange = e => { this.categoryName = e.target.value; };
  handleUserChange = e => { this.selectedUsers = e.detail.value; };
  get disableSave() { return !this.categoryName || this.selectedUsers.length === 0; }

  handleSave() {
    saveCategory({ name: this.categoryName, userLoginIds: this.selectedUsers })
      .then(() => {
        this.toast('Sukces', 'Kategoria zapisana', 'success');
        this.categoryName  = '';
        this.selectedUsers = [];
        this.refreshCategories();
      })
      .catch(err => this.toast('Błąd', err.body?.message || err.message, 'error'));
  }

  handleDelete(e) {
    const catId = e.currentTarget.dataset.id;   
    deleteCategory({ catId })
      .then(() => {
        this.toast('Sukces', 'Kategoria usunięta', 'success');
        this.refreshCategories();
      })
      .catch(err => this.toast('Błąd', err.body?.message || err.message, 'error'));
  }

  refreshCategories() {
    getAllCategories()
      .then(data => { this.categories = data; })
      .catch(() => { this.toast('Błąd', 'Nie udało się pobrać kategorii', 'error'); });
  }

  loadUsers() {
    getAllUserLogins()
      .then(users => {
        this.userOptions = users.map(u => ({ label: u.Name, value: u.Id }));
      })
      .catch(() => { this.toast('Błąd', 'Nie udało się pobrać użytkowników', 'error'); });
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
