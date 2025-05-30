import { LightningElement, track } from 'lwc';
import getSurveysForUser from '@salesforce/apex/SurveyController.getSurveysForUser';
import getQuestions from '@salesforce/apex/SurveyController.getQuestions';
import submitResponsesApex from '@salesforce/apex/SurveyController.submitResponses';
import checkUserSubmitted from '@salesforce/apex/SurveyController.hasUserSubmitted';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const ALLOWED_ROLES = ['User', 'Worker'];

export default class SurveyFiller extends LightningElement {
  @track surveys = [];
  @track selectedSurveyId = '';
  @track questions = null;
  @track isAscending = true;
  @track isSurveyExpired = false;
  @track selectedSurveyEndDate = null;
  @track selectedStatus = 'all';
  @track alreadySubmittedMap = {};
  @track showModal = false;
  isAuthorized = false;

  userLoginId;
  userRole;

    connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));

    /* brak danych logowania → przenosimy do /Login */
    if (!user) {
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.userLoginId = user.Id;
    this.userRole    = user.Role__c;

    /* ─── autoryzacja roli ─── */
    if (!ALLOWED_ROLES.includes(this.userRole)) {
      alert('Tylko role „User” i „Worker” mogą wypełniać ankiety.');
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.isAuthorized = true;
    this.loadSurveys();
  }

  async loadSurveys() {
    try {
      const data = await getSurveysForUser({ userLoginId: this.userLoginId });
      const now  = new Date();

      const submitted = await Promise.all(
        data.map(s => checkUserSubmitted({ surveyId: s.Id, userLoginId: this.userLoginId }))
      );

      this.surveys = data.map((s, i) => ({
        ...s,
        isExpired      : s.End_Date__c ? new Date(s.End_Date__c) < now : false,
        alreadySubmitted : submitted[i]
      }));
    } catch (err) {
      this.toast('Error', err.body?.message || err.message, 'error');
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
          selected: q.Is_MultiSelect__c ? [] : ''
        }));

        this.showModal = true;
      })
      .catch(err => this.toast('Error', err.body?.message || err, 'error'));
  }

  closeModal() {
    this.showModal = false;
  }

  handleResponse(e) {
    const qid = e.target.dataset.qid;
    const selectedValue = e.detail.value;

    this.questions = this.questions.map(q => {
      if (q.Id !== qid) return q;
      return { ...q, selected: selectedValue };
    });
  }

  async submitResponses() {
    if (this.isSurveyExpired) {
      this.toast('Error', 'Survey has expired. You cannot submit answers.', 'error');
      return;
    }

    const payload = this.questions.flatMap(q => {
      if (!q.selected || q.selected.length === 0) return [];

      if (Array.isArray(q.selected)) {
        return q.selected.map(val => ({
          Question_PROJ__c: q.Id,
          Selected_Choice__c: val
        }));
      }

      return [{
        Question_PROJ__c: q.Id,
        Selected_Choice__c: q.selected
      }];
    });

    if (!payload.length) {
      this.toast('Error', 'No answers selected.', 'error');
      return;
    }

    try {
      await submitResponsesApex({ responses: payload, userLoginId: this.userLoginId });

      this.toast('Dziękujemy!', 'Twoje odpowiedzi zostały zapisane.', 'success');

      this.selectedSurveyId = '';
      this.questions = null;
      this.selectedSurveyEndDate = null;
      this.showModal = false;

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
