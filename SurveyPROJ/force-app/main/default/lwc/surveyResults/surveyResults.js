import { LightningElement, track } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getSurveyStats from '@salesforce/apex/SurveyController.getSurveyStats';
import getAverageRating from '@salesforce/apex/SurveyController.getAverageRating';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SurveyResults extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track rowData = [];
  @track totalCount = 0;
  @track averageRating = 0;
  @track isAuthorized = false;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.isAuthorized = true;

    getAllSurveys()
      .then(data => {
        this.surveyOptions = data.map(s => ({
          label: s.Title_c__c,
          value: s.Id
        }));
      })
      .catch(err => {
        this.toast('Error', err.body?.message || err.message, 'error');
      });
  }

  handleSurveyChange(e) {
    this.selectedSurveyId = e.detail.value;

    getSurveyStats({ surveyId: this.selectedSurveyId })
      .then(stats => {
        const total = stats.reduce((sum, r) => sum + r.count, 0);
        this.rowData = stats.map((r, idx) => ({
          id: idx,
          question: r.questionText,
          option: r.choice,
          count: r.count,
          percent: total > 0 ? ((r.count / total) * 100).toFixed(1) + '%' : '0%'
        }));
        this.totalCount = total;
      })
      .catch(err => {
        this.toast('Error', err.body?.message || err.message, 'error');
      });

    getAverageRating({ surveyId: this.selectedSurveyId })
      .then(avg => {
        this.averageRating = avg !== null ? avg.toFixed(2) : 'Brak ocen';
      })
      .catch(err => {
        this.toast('Error', 'Nie udało się załadować średniej oceny', 'error');
      });
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
