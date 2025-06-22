import { LightningElement, track } from 'lwc';
import getSurveysForUser from '@salesforce/apex/SurveyController.getSurveysForUser';
import getQuestions from '@salesforce/apex/SurveyController.getQuestions';
import submitResponsesApex from '@salesforce/apex/SurveyController.submitResponses';
import checkUserSubmitted from '@salesforce/apex/SurveyController.hasUserSubmitted';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const ALLOWED_ROLES = ['User'];

export default class SurveyFiller extends LightningElement {
  @track surveys = [];
  @track alreadySubmittedMap = {};

  @track selectedSurveyId = '';
  @track questions = null;
  @track showModal = false;
  @track isSurveyExpired = false;
  @track selectedSurveyEndDate = null;
  @track isAscending = true;

  @track selectedCategory = 'all';
  @track categories = [];

  isAuthorized = false;
  userLoginId;
  userRole;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.userLoginId = user.Id;
    this.userRole = user.Role__c;

    if (!ALLOWED_ROLES.includes(this.userRole)) {
      alert('Only User and worker can complete the surveys.');
      localStorage.removeItem('user');
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.isAuthorized = true;
    this.loadSurveys();
  }

async loadSurveys() {
    try {
        const data = await getSurveysForUser({ userLoginId: this.userLoginId });
        const now = new Date();

        const submitted = await Promise.all(
            data.map(s => checkUserSubmitted({ surveyId: s.Id, userLoginId: this.userLoginId }))
        );

        this.surveys = data.map((s, i) => ({
            ...s,
            isExpired: s.End_Date__c ? new Date(s.End_Date__c) < now : false,
            alreadySubmitted: submitted[i]
        }));

        const catSet = new Set();
        this.surveys.forEach(s => {
            if (s.Category_PROJ__r?.Name) {
                catSet.add(s.Category_PROJ__r.Name);
            }
        });
        this.categories = Array.from(catSet).sort();
    } catch (err) {
        this.toast('Error', err.body?.message || err.message, 'error');
    }
}


  toggleSortDirection() {
    this.isAscending = !this.isAscending;
  }

  handleCategoryChange(e) {
    this.selectedCategory = e.detail.value;
  }

  async handleSurveyClick(e) {
    this.selectedSurveyId = e.target.dataset.id;
    this.questions = null;
    this.isSurveyExpired = false;
    this.selectedSurveyEndDate = null;

    try {
      const data = await getQuestions({ surveyId: this.selectedSurveyId });

      if (!data.length) {
        this.toast('Error', 'Add at least one question to the survey.', 'error');
        return;
      }

      const surveyEndDateStr = data[0].Survey__r?.End_Date__c;
      if (!surveyEndDateStr) {
        this.toast('Error', 'Add end date to survey.', 'error');
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
    } catch (err) {
      this.toast('Error', err.body?.message || err, 'error');
    }
  }

  closeModal() {
    this.showModal = false;
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

    const payload = this.questions.flatMap(q => {
      if (!q.selected || q.selected.length === 0) return [];

      if (Array.isArray(q.selected)) {
        return q.selected.map(val => ({
          Question_PROJ__c: q.Id,
          Selected_Choice__c: val,
          Survey__c: this.selectedSurveyId
        }));
      }

      return [{
        Question_PROJ__c: q.Id,
        Selected_Choice__c: q.selected,
        Survey__c: this.selectedSurveyId
      }];
    });

    if (!payload.length) {
      this.toast('Error', 'No answers selected.', 'error');
      return;
    }

    try {
      await submitResponsesApex({ responses: payload, userLoginId: this.userLoginId });

      this.toast('Thanks!', 'Your answers are saved.', 'success');

      this.selectedSurveyId = '';
      this.questions = null;
      this.selectedSurveyEndDate = null;
      this.showModal = false;

      await this.loadSurveys();
      window.location.reload();
    } catch (err) {
      this.toast('Error', err.body?.message || 'Submission failed', 'error');
    }
  }

  get categoryOptions() {
    return [
      { label: 'All', value: 'all' },
      ...this.categories.map(name => ({ label: name, value: name }))
    ];
  }

  get filteredSurveys() {
    let filtered = this.surveys;

    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(
        s => s.Category_PROJ__r?.Name === this.selectedCategory
      );
    }
    return [...filtered].sort((a, b) => {
      const aDate = new Date(a.End_Date__c);
      const bDate = new Date(b.End_Date__c);
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
