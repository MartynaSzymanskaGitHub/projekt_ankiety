import { LightningElement, track } from 'lwc';
import saveCategory      from '@salesforce/apex/CategoryController.saveCategory';
import updateCategory    from '@salesforce/apex/CategoryController.updateCategory';
import getAllCategories  from '@salesforce/apex/CategoryController.getAllCategories';
import deleteCategory    from '@salesforce/apex/CategoryController.deleteCategory';
import getAllUserLogins  from '@salesforce/apex/CategoryController.getAllUserLogins';
import getAssignedUserIds from '@salesforce/apex/CategoryController.getAssignedUserIds';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CategoryCreator extends LightningElement {
  @track categories    = [];
  @track userOptions   = [];

  @track categoryId    = null;
  @track categoryName  = '';
  @track selectedUsers = [];

  connectedCallback() {
    this.refreshCategories();
    this.loadUsers();
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
    let action;
    if (this.categoryId) {
      action = updateCategory;
      params.catId = this.categoryId;
    } else {
      action = saveCategory;
    }

    action(params)
      .then(res => {
        this.toast('Sukces', this.categoryId ? 'Zaktualizowano' : 'Dodano', 'success');
        this.resetForm();
        this.refreshCategories();
      })
      .catch(err => this.toast('Błąd', err.body?.message || err.message, 'error'));
  }

  handleEdit(e) {
    const id = e.currentTarget.dataset.id;
    const rec = this.categories.find(c => c.Id === id);
    this.categoryId   = rec.Id;
    this.categoryName = rec.Name;
    getAssignedUserIds({ catId: id })
      .then(ids => {
        this.selectedUsers = ids;
      })
      .catch(err => this.toast('Błąd', 'Nie udało się załadować użytkowników', 'error'));
  }

  handleDelete(e) {
    deleteCategory({ catId: e.currentTarget.dataset.id })
      .then(() => {
        this.toast('Sukces', 'Usunięto', 'success');
        this.refreshCategories();
      })
      .catch(err => this.toast('Błąd', err.body?.message || err.message, 'error'));
  }

  resetForm() {
    this.categoryId    = null;
    this.categoryName  = '';
    this.selectedUsers = [];
  }

  refreshCategories() {
    getAllCategories()
      .then(data => this.categories = data);
  }
  loadUsers() {
    getAllUserLogins()
      .then(u => this.userOptions = u.map(x => ({ label: x.Name, value: x.Id })));
  }

  toast(title, msg, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message: msg, variant }));
  }
}
