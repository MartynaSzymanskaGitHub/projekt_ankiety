import { LightningElement, track } from 'lwc';
import saveSurvey       from '@salesforce/apex/SurveyController.saveSurvey';
import getAllCategories from '@salesforce/apex/CategoryController.getAllCategories';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

function uid() {
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

export default class SurveyCreator extends LightningElement {
  /* ------- pola formularza ------- */
  @track title              = '';
  @track description        = '';
  @track endDate            = '';
  @track selectedCategoryId = '';
  @track categories         = [];

  /* ------- pytania ------- */
  @track questions = [
    { id: 1, text: '', multi: false, choices: [{ id: uid(), value: '' }] }
  ];

  /* ------- stan UI ------- */
  isSaving     = false;
  isAuthorized = false;

  /* ============================================================= */
  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role__c !== 'Admin') {
        alert('Unauthorized role. Sending to loading page...');
      window.location.href = '/lightning/n/Login';
      return;
    }
    this.isAuthorized = true;

    getAllCategories()
      .then(data => {
        this.categories = data.map(c => ({ label: c.Name, value: c.Id }));
      })
      .catch(err => {
        this.toast('Error', 'Error loading categories: ' +
                  (err.body?.message || err.message), 'error');
      });
  }

  /* ------- handlery formularza ------- */
  handleTitleChange(e)       { this.title       = e.target.value; }
  handleDescriptionChange(e) { this.description = e.target.value; }
  handleEndDateChange(e)     { this.endDate     = e.target.value; }
  handleCategoryChange(e)    { this.selectedCategoryId = e.detail.value; }

  /* =============================================================
     ========== P Y T A N I A  I  O D P O W I E D Z I =============
     ============================================================= */

  addQuestion() {
    const nextId = this.questions.length + 1;
    this.questions = [
      ...this.questions,
      { id: nextId, text: '', multi: false, choices: [{ id: uid(), value: '' }] }
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

  toggleMultiSelect(e) {
    const id = Number(e.target.dataset.id);
    const checked = e.target.checked;
    this.questions = this.questions.map(q =>
      q.id === id ? { ...q, multi: checked } : q
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

  /* ------- walidacja daty ------- */
  isDateInPast(str) { return new Date(str) < new Date(); }

  /* ------- ZAPIS ------- */
  saveSurvey() {
    if (!this.title || !this.endDate || !this.selectedCategoryId) {
      this.toast('Error', 'Uzupełnij tytuł, datę i kategorię', 'error');
      return;
    }
    if (this.isDateInPast(this.endDate)) {
      this.toast('Error', 'Ending date cannot be earlier than now.', 'error');
      return;
    }

    this.isSaving = true;

    const survey = {
      Title_c__c       : this.title,
      Description__c   : this.description,
      End_Date__c      : this.endDate,
      Category_PROJ__c : this.selectedCategoryId
    };

    const questions = this.questions.map(q => ({
      Question_Text__c  : q.text,
      Choices__c        : q.choices.map(c => c.value.trim()).filter(v=>v).join(';'),
      Is_MultiSelect__c : q.multi
    }));

    saveSurvey({ survey, questions })
      .then(() => {
        this.toast('Success', 'Survey saved', 'success');
        this.title = this.description = this.endDate = this.selectedCategoryId = '';
        this.questions = [{ id: 1, text: '', multi: false, choices: [{ id: uid(), value: '' }] }];
      })
      .catch(err => {
        this.toast('Error', err.body?.message || err, 'error');
      })
      .finally(() => { this.isSaving = false; });
  }

  /* ------- toast util ------- */
  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
