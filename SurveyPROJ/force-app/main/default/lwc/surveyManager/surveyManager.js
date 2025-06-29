import { LightningElement, track, wire } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import deleteSurvey from '@salesforce/apex/SurveyController.deleteSurvey';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class SurveyManager extends LightningElement {
  @track allSurveys = [];
  @track surveys = [];
  @track filterTitle = '';
  @track sortBy = 'Title_c__c';
  @track sortDirection = 'asc';
  wiredSurveys;
  isAuthorized = false;

  columns = [
    { label: 'Title', fieldName: 'Title_c__c', sortable: true },
    { label: 'Description', fieldName: 'Description__c', sortable: true },
    {
      type: 'action',
      typeAttributes: {
        rowActions: [{ label: 'Delete', name: 'delete', iconName: 'utility:delete' }]
      }
    }
  ];

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role__c !== 'Admin') {
      localStorage.removeItem('user');
      window.location.href = '/lightning/n/Login';
    } else {
      this.isAuthorized = true;
    }
  }

  @wire(getAllSurveys)
  wiredResult(result) {
    this.wiredSurveys = result;
    if (result.data) {
      this.allSurveys = result.data;
      this.applyFilterAndSort();
    }
  }

  handleFilterChange(event) {
    this.filterTitle = event.target.value.toLowerCase();
    this.applyFilterAndSort();
  }

  handleSort(event) {
    this.sortBy = event.detail.fieldName;
    this.sortDirection = event.detail.sortDirection;
    this.applyFilterAndSort();
  }


  applyFilterAndSort() {
    const filtered = [];

    for (let i = 0; i < this.allSurveys.length; i++) {
      const s = this.allSurveys[i];
      const title = (s.Title_c__c || '').toLowerCase();
      if (title.includes(this.filterTitle)) {
        filtered.push(s);
      }
    }

    filtered.sort((a, b) => {
      const valA = (a[this.sortBy] || '').toLowerCase();
      const valB = (b[this.sortBy] || '').toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.surveys = filtered;
  }


  handleRowAction(event) {
    const { name } = event.detail.action;
    const surveyId = event.detail.row.Id;

    if (name === 'delete') {
      deleteSurvey({ surveyId })
        .then(() => {
          this.toast('Success', 'Survey deleted', 'success');
          return refreshApex(this.wiredSurveys);
        })
        .then(() => {
          this.applyFilterAndSort();
        })
        .catch(err => {
          this.toast('Error', err.body?.message || err, 'error');
        });
    }
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
