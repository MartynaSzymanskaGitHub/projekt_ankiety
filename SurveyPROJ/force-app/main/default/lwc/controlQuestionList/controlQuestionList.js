import { LightningElement, track } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getControlQuestions from '@salesforce/apex/SurveyController.getControlQuestions';

export default class ControlQuestionList extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track questions = [];

  columns = [
    { label: 'Pytanie',        fieldName: 'Question_Text__c', type: 'text', wrapText: true },
    { label: 'Poprawna odpowiedź', fieldName: 'Correct_Choice__c', type: 'text' }
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
      .catch(err => console.error('Błąd ładowania ankiet:', err));
  }

  handleSurveyChange(evt) {
    this.selectedSurveyId = evt.detail.value;
    this.questions = [];
    getControlQuestions({ surveyId: this.selectedSurveyId })
      .then(qs => {
        console.log('Pobrane pytania:', qs);
        this.questions = qs;
      })
      .catch(err => {
        console.error('Błąd pobierania pytań:', err);
        this.questions = [];
      });
  }
}
