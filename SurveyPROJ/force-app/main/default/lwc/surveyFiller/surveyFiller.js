import { LightningElement, track } from 'lwc';
import getAllSurveys       from '@salesforce/apex/SurveyController.getAllSurveys';
import getQuestions        from '@salesforce/apex/SurveyController.getQuestions';
import submitResponsesApex from '@salesforce/apex/SurveyController.submitResponses';
import { ShowToastEvent }  from 'lightning/platformShowToastEvent';

export default class SurveyFiller extends LightningElement {
  @track surveyOptions = [];      // [{label, value}]
  @track selectedSurveyId = '';   // Id wybranej ankiety
  @track questions = null;        // lista Question_PROJ__c

  /* --- ładowanie listy ankiet --- */
  connectedCallback() {
    getAllSurveys()
      .then(data => {
        this.surveyOptions = data.map(s => ({
          label : s.Title_c__c,
          value : s.Id
        }));
      })
      .catch(err => this.toast('Error', err.body?.message || err, 'error'));
  }

  /* --- po wyborze ankiety --- */
handleSurveyChange(e) {
  this.selectedSurveyId = e.detail.value;
  this.questions = null;

  getQuestions({ surveyId: this.selectedSurveyId })
    .then(data => {
      // dla każdej rekordowej Question_PROJ__c budujemy tablicę options
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

  /* --- submit --- */
submitResponses() {
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
    })
    .catch(err => {
      this.toast('Error', err.body?.message || 'Submission failed', 'error');
    });
}



  /* helper toast */
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
