import { LightningElement, track } from 'lwc';
import getAllSurveysWithSorting from '@salesforce/apex/SurveyController.getAllSurveysWithSorting';
import getQuestions from '@salesforce/apex/SurveyController.getQuestions';
import submitResponsesApex from '@salesforce/apex/SurveyController.submitResponses';
import checkUserSubmitted from '@salesforce/apex/SurveyController.hasUserSubmitted';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SurveyFiller extends LightningElement {
  @track surveys = [];
  @track selectedSurveyId = '';
  @track questions = null;
  @track isAscending = true;
  @track isSurveyExpired = false;
  @track selectedSurveyEndDate = null;
  @track selectedStatus = 'all'; // all | active | expired
  @track alreadySubmittedMap = {};
  isAuthorized = false;

  userLoginId; // <-- dodane

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.userLoginId = user.Id; // <-- zapamiętujemy ID z User_Login__c
    this.isAuthorized = true;
    this.loadSurveys();
  }

  async loadSurveys() {
    try {
      const data = await getAllSurveysWithSorting({ ascending: this.isAscending });
      const now = new Date();

      const results = await Promise.all(
        data.map(s => checkUserSubmitted({ surveyId: s.Id, userLoginId: this.userLoginId }))
      );

      this.surveys = data.map((s, index) => ({
        ...s,
        isExpired: s.End_Date__c ? new Date(s.End_Date__c) < now : false,
        alreadySubmitted: results[index]
      }));
    } catch (err) {
      this.toast('Error', err.body?.message || err.message || err, 'error');
    }
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

  async submitResponses() {
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

    try {
      await submitResponsesApex({ responses: payload, userLoginId: this.userLoginId });

      this.toast('Thank you!', 'Your survey has been submitted.', 'success');

      this.selectedSurveyId = '';
      this.questions = null;
      this.selectedSurveyEndDate = null;

      // 🔁 Odśwież stronę
      window.location.reload();

    } catch (err) {
      this.toast('Error', err.body?.message || 'Submission failed', 'error');
    }
  }

  handleStatusChange(e) {
    this.selectedStatus = e.detail.value;
  }

  get statusOptions() {
    return [
      { label: 'Wszystkie', value: 'all' },
      { label: 'Aktywne', value: 'active' },
      { label: 'Zakończone', value: 'expired' }
    ];
  }

  get filteredSurveys() {
    let filtered = this.surveys;

    if (this.selectedStatus === 'active') {
      filtered = filtered.filter(s => !s.isExpired);
    } else if (this.selectedStatus === 'expired') {
      filtered = filtered.filter(s => s.isExpired);
    }

    return [...filtered].sort((a, b) => {
      const aDate = a.End_Date__c ? new Date(a.End_Date__c) : new Date(8640000000000000);
      const bDate = b.End_Date__c ? new Date(b.End_Date__c) : new Date(8640000000000000);
      return this.isAscending ? aDate - bDate : bDate - aDate;
    });
  }

  get sortIcon() {
    return this.isAscending ? 'utility:arrowup' : 'utility:arrowdown';
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
