import { LightningElement, track } from 'lwc';
import saveSurvey from '@salesforce/apex/SurveyController.saveSurvey';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

function uid() {
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

export default class SurveyCreator extends LightningElement {
  @track title = '';
  @track description = '';
  @track endDate = '';
  @track questions = [
    { id: 1, text: '', choices: [{ id: uid(), value: '' }] }
  ];
  isSaving = false;
  isAuthorized = false;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
      window.location.href = '/lightning/n/Login';
      return;
    }

    if (user.Role__c !== 'Admin') {
      alert('Brak dostępu. Tylko administrator może tworzyć ankiety.');
      window.location.href = '/lightning/n/Login'; 
    }
    this.isAuthorized = true;
  }

  handleTitleChange(e) {
    this.title = e.target.value;
  }

  handleDescriptionChange(e) {
    this.description = e.target.value;
  }

  handleEndDateChange(e) {
    this.endDate = e.target.value;
  }

  addQuestion() {
    const nextId = this.questions.length + 1;
    this.questions = [
      ...this.questions,
      { id: nextId, text: '', choices: [{ id: uid(), value: '' }] }
    ];
  }

  removeQuestion(e) {
    const id = Number(e.target.dataset.id);
    this.questions = this.questions.filter(q => q.id !== id);
  }

  handleQuestionTextChange(e) {
    const id = Number(e.target.dataset.id);
    this.questions = this.questions.map(q =>
      q.id === id ? { ...q, text: e.target.value } : q
    );
  }

  addChoice(e) {
    const qid = Number(e.target.dataset.id);
    this.questions = this.questions.map(q =>
      q.id === qid
        ? { ...q, choices: [...q.choices, { id: uid(), value: '' }] }
        : q
    );
  }

  removeChoice(e) {
    const qid = Number(e.target.dataset.qid);
    const cid = e.target.dataset.cid;
    this.questions = this.questions.map(q =>
      q.id === qid
        ? { ...q, choices: q.choices.filter(c => c.id !== cid) }
        : q
    );
  }

  handleChoiceChange(e) {
    const qid = Number(e.target.dataset.qid);
    const cid = e.target.dataset.cid;
    const val = e.target.value;
    this.questions = this.questions.map(q =>
      q.id === qid
        ? {
            ...q,
            choices: q.choices.map(c =>
              c.id === cid ? { ...c, value: val } : c
            )
          }
        : q
    );
  }

  isDateInPast(datetimeStr) {
    const now = new Date();
    const selected = new Date(datetimeStr);
    return selected < now;
  }

  saveSurvey() {
    if (!this.title) {
      this.toast('Error', 'Survey title is required', 'error');
      return;
    }

    if (!this.endDate) {
      this.toast('Error', 'End date is required', 'error');
      return;
    }

    if (this.isDateInPast(this.endDate)) {
      this.toast('Error', 'End date cannot be in the past', 'error');
      return;
    }

    this.isSaving = true;

    const survey = {
      Title_c__c: this.title,
      Description__c: this.description,
      End_Date__c: this.endDate
    };

    const questions = this.questions.map(q => ({
      Question_Text__c: q.text,
      Choices__c: q.choices
        .map(c => c.value.trim())
        .filter(v => v)
        .join(';')
    }));

    saveSurvey({ survey, questions })
      .then(() => {
        this.toast('Success', 'Survey saved', 'success');
        this.title = '';
        this.description = '';
        this.endDate = '';
        this.questions = [
          { id: 1, text: '', choices: [{ id: uid(), value: '' }] }
        ];
        window.location.reload();
      })
      .catch(err => {
        this.toast('Error', err.body?.message || err, 'error');
      })
      .finally(() => (this.isSaving = false));
  }


  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
