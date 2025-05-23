import { LightningElement, track } from 'lwc';
import getAllSurveysWithSorting from '@salesforce/apex/SurveyController.getAllSurveysWithSorting';
import getQuestions from '@salesforce/apex/SurveyController.getQuestions';
import submitResponsesApex from '@salesforce/apex/SurveyController.submitResponses';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SurveyFiller extends LightningElement {
  @track surveys = [];
  @track selectedSurveyId = '';
  @track questions = null;
  @track isAscending = true;
  @track isSurveyExpired = false;
  @track selectedSurveyEndDate = null;

  connectedCallback() {
    this.loadSurveys();
  }

loadSurveys() {
  getAllSurveysWithSorting({ ascending: this.isAscending })
    .then(data => {
      const now = new Date();
      this.surveys = data.map(s => ({
        ...s,
        isExpired: new Date(s.End_Date__c) < now
      }));
    })
    .catch(err => this.toast('Error', err.body?.message || err, 'error'));
}


  toggleSortDirection() {
    this.isAscending = !this.isAscending;
    this.loadSurveys();
  }

  handleSurveyClick(e) {
    this.selectedSurveyId = e.target.dataset.id;
    this.questions = null;
    this.isSurveyExpired = false;
    this.selectedSurveyEndDate = null;

    getQuestions({ surveyId: this.selectedSurveyId })
      .then(data => {
        if (!data.length) return;

        const surveyEndDateStr = data[0].Survey__r?.End_Date__c;
        if (!surveyEndDateStr) {
          this.toast('Error', 'Brak daty zakończenia ankiety.', 'error');
          return;
        }
        const surveyEndDate = new Date(surveyEndDateStr);
        const now = new Date();
        this.selectedSurveyEndDate = surveyEndDate;
        this.isSurveyExpired = surveyEndDate < now;

        this.questions = data.map(q => ({
          ...q,
          options: q.Choices__c
            ? q.Choices__c.split(';').map(c => ({ label: c, value: c }))
            : [],
          selected: ''
        }));
      })
      .catch(err => this.toast('Error', err.body?.message || err, 'error'));
  }

  handleResponse(e) {
    const qid = e.target.dataset.qid;
    const selectedValue = e.detail.value;
    this.questions = this.questions.map(q =>
      q.Id === qid ? { ...q, selected: selectedValue } : q
    );
  }

  submitResponses() {
    if (this.isSurveyExpired) {
      this.toast('Error', 'Survey has expired. You cannot submit answers.', 'error');
      return;
    }

    const payload = this.questions
      .filter(q => q.selected)
      .map(q => ({
        Question_PROJ__c: q.Id,
        Selected_Choice__c: q.selected
      }));

    if (!payload.length) {
      this.toast('Error', 'No answers selected.', 'error');
      return;
    }

    submitResponsesApex({ responses: payload })
      .then(() => {
        this.toast('Thank you!', 'Your survey has been submitted.', 'success');
        this.selectedSurveyId = '';
        this.questions = null;
        this.selectedSurveyEndDate = null;
      })
      .catch(err => {
        this.toast('Error', err.body?.message || 'Submission failed', 'error');
      });
  }

  get sortIcon() {
    return this.isAscending ? 'utility:arrowup' : 'utility:arrowdown';
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
