import { LightningElement, track } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getControlQuestions from '@salesforce/apex/SurveyController.getControlQuestions';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ControlQuestionList extends LightningElement {
  @track surveyOptions    = [];
  @track selectedSurveyId = '';
  @track questions        = [];

  // definicja kolumn do lightning-datatable
  columns = [
    { label: 'Pytanie',             fieldName: 'Question_Text__c',   type: 'text', wrapText: true },
    { label: 'Poprawna odpowiedź',  fieldName: 'Correct_Choice__c',      type: 'text' }
  ];

  // jeśli wybrano ankietę, a lista pytań jest pusta, pokaż komunikat
  get noData() {
    return this.selectedSurveyId && this.questions.length === 0;
  }

  connectedCallback() {
    // załaduj listę ankiet
    getAllSurveys()
      .then(list => {
        this.surveyOptions = list.map(s => ({
          label: s.Title_c__c,
          value: s.Id
        }));
      })
      .catch(err => {
        this.dispatchEvent(new ShowToastEvent({
          title: 'Błąd ładowania ankiet',
          message: err.body?.message || err.message,
          variant: 'error'
        }));
      });
  }

  handleSurveyChange(evt) {
    // zmień ankietę i wyczyść poprzednie pytania
    this.selectedSurveyId = evt.detail.value;
    this.questions = [];

    // pobierz pytania kontrolne dla wybranej ankiety
    getControlQuestions({ surveyId: this.selectedSurveyId })
      .then(qs => {
        this.questions = qs;
      })
      .catch(err => {
        this.dispatchEvent(new ShowToastEvent({
          title: 'Błąd pobierania pytań',
          message: err.body?.message || err.message,
          variant: 'error'
        }));
        this.questions = [];
      });
  }
}
