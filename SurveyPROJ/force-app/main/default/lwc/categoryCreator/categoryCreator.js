import { LightningElement, track } from 'lwc';
import saveCategory         from '@salesforce/apex/CategoryController.saveCategory';
import getAllCategories     from '@salesforce/apex/CategoryController.getAllCategories';
import deleteCategory       from '@salesforce/apex/CategoryController.deleteCategory';
import { ShowToastEvent }   from 'lightning/platformShowToastEvent';

export default class CategoryCreator extends LightningElement {
  /* --- formularz --- */
  @track categoryName  = '';
  @track selectedRoles = [];

  /* --- dane --- */
  @track categories    = [];
  isAuthorized         = false;

  roleOptions = [
    { label: 'User',   value: 'User'   },
    { label: 'Worker', value: 'Worker' }
  ];

  /* ---------- lifecycle ---------- */
  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role__c !== 'Admin') {
      window.location.href = '/lightning/n/Login';
      return;
    }
    this.isAuthorized = true;
    this.refreshCategories();
  }

  /* ---------- handlery ---------- */
  handleNameChange   = e => { this.categoryName  = e.target.value; };
  handleRoleChange   = e => { this.selectedRoles = e.detail.value; };
  get disableSave()  { return !this.categoryName || this.selectedRoles.length === 0; }

  /* ---------- zapisz ---------- */
  handleSave() {
    saveCategory({ name: this.categoryName, allowedRoles: this.selectedRoles })
      .then(() => {
        this.toast('Sukces', 'Kategoria zapisana', 'success');
        this.categoryName  = '';
        this.selectedRoles = [];
        this.refreshCategories();
      })
      .catch(err => this.toast('Błąd', err.body?.message || err.message, 'error'));
  }

  /* ---------- usuń ---------- */
  handleDelete(e) {
    const catId = e.currentTarget.dataset.id;   // <- KLUCZOWA zmiana
    deleteCategory({ catId })
      .then(() => {
        this.toast('Sukces', 'Kategoria usunięta', 'success');
        this.refreshCategories();
      })
      .catch(err => this.toast('Błąd', err.body?.message || err.message, 'error'));
  }

  /* ---------- refresh ---------- */
  refreshCategories() {
    getAllCategories()
      .then(data => { this.categories = data; })
      .catch(()   => { this.toast('Błąd', 'Nie udało się pobrać listy kategorii', 'error'); });
  }

  /* ---------- toast util ---------- */
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
