import { LightningElement, track } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getControlQuestions from '@salesforce/apex/SurveyController.getControlQuestions';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ControlQuestionList extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track questions = [];

  columns = [
    { label: 'Question', fieldName: 'Question_Text__c', type: 'text', wrapText: true },
    { label: 'correct answer',  fieldName: 'Correct_Choice__c', type: 'text' }
  ];

  get noData() {
    return this.selectedSurveyId && this.questions.length === 0;
  }

  connectedCallback() {
    getAllSurveys()
      .then(list => {
        this.surveyOptions = list.map(s => ({
          label: s.Title_c__c,
          value: s.Id
        }));
      })
      .catch(err => {
        this.dispatchEvent(new ShowToastEvent({
          title: 'Error loading surveys',
          message: err.body?.message || err.message,
          variant: 'error'
        }));
      });
  }

  handleSurveyChange(evt) {
    this.selectedSurveyId = evt.detail.value;
    this.questions = [];

    getControlQuestions({ surveyId: this.selectedSurveyId })
      .then(qs => {
        this.questions = qs;
      })
      .catch(err => {
        this.dispatchEvent(new ShowToastEvent({
          title: 'Error',
          message: err.body?.message || err.message,
          variant: 'error'
        }));
        this.questions = [];
      });
  }
}
