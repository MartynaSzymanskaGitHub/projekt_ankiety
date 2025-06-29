import { LightningElement, track } from 'lwc';
import saveSurvey from '@salesforce/apex/SurveyController.saveSurvey';
import getAllCategories from '@salesforce/apex/CategoryController.getAllCategories';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

let uidCounter = 1;

function uid() {
  return 'id-' + uidCounter++;
}


export default class SurveyCreator extends LightningElement {
  @track title = '';
  @track description = '';
  @track endDate = '';
  @track selectedCategoryId = '';
  @track categories = [];
  

  @track questions = [
    {
      id: 1,
      text: '',
      multi: false,
      isControl: false,
      radioGroupName: 'correct-1',
      choices: [{ id: uid(), value: '', isCorrect: false }]
    }
  ];

  isSaving = false;
  isAuthorized = false;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role__c !== 'Admin') {
      alert('Unauthorized role. Sending to login page...');
      localStorage.removeItem('user');
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

  handleTitleChange(e) { this.title  = e.target.value; }
  handleDescriptionChange(e) { this.description = e.target.value; }
  handleEndDateChange(e) { this.endDate = e.target.value; }
  handleCategoryChange(e) { this.selectedCategoryId = e.detail.value; }

  addQuestion() {
    const newId = this.questions.length + 1;
    this.questions = [
      ...this.questions,
      {
        id: newId,
        text: '',
        multi: false,
        isControl: false,
        radioGroupName: `correct-${newId}`,
        choices: [
          { id: uid(), value: '', isCorrect: false },
          { id: uid(), value: '', isCorrect: false }
        ]
      }
    ];
  }

  get disableControlQuestion() {
    return this.questions.length < 5;
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

  toggleIsControl(e) {
    const id  = Number(e.target.dataset.id);
    const checked = e.target.checked;

    this.questions = this.questions.map(q => {
      if (q.id !== id) return q;

      return {
        ...q,
        isControl: checked,
        multi : checked ? false : q.multi  
      };
    });
  }


  markCorrectAnswer(e) {
    const qid = Number(e.target.dataset.qid);
    const cid = e.target.dataset.cid;   

    this.questions = this.questions.map(q => {
      if (q.id !== qid) return q;
      return {
        ...q,
        choices: q.choices.map(c => ({ ...c, isCorrect: c.id === cid }))
      };
    });
  }

  addChoice(e) {
    const qid = Number(e.target.dataset.id);
    this.questions = this.questions.map(q =>
      q.id === qid
        ? { ...q, choices: [...q.choices, { id: uid(), value: '', isCorrect: false }] }
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
    this.questions = this.questions.map(q => {
      if (q.id !== qid) return q;
      return {
        ...q,
        choices: q.choices.map(c => {
          if (c.id !== cid) return c;
          return { ...c, value: val };
        })
      };
    });
  }


  isDateInPast(str) {
    return new Date(str) < new Date();
  }


  saveSurvey() {
    if (!this.title || !this.endDate || !this.selectedCategoryId) {
      this.toast('Error', 'Enter title, date and category', 'error');
      return;
    }
    if (this.isDateInPast(this.endDate)) {
      this.toast('Error', 'Ending date cannot be earlier than now.', 'error');
      return;
    }

    const allQuestionsOk = this.questions.every(q => {
      const filled = q.choices.filter(c => String(c.value).trim().length > 0);
      return q.text.trim().length > 0 && filled.length >= 2;
    });
    if (!allQuestionsOk) {
      this.toast('Error',
        'Każde pytanie musi mieć treść i co najmniej dwie odpowiedzi.',
        'error');
      return;
    }

    for (const q of this.questions) {
      if (q.isControl) {
        const correct = q.choices.find(
          c => c.isCorrect && String(c.value).trim().length > 0
        );
        if (!correct) {
          this.toast('Error',
            `Control question "${q.text || '(bez tytułu)'}" must have correct answer.`,
            'error');
          return;
        }
      }
    }

    const survey = {
      Title_c__c : this.title,
      Description__c : this.description,
      End_Date__c : this.endDate,
      Category_PROJ__c : this.selectedCategoryId
    };

    const questions = this.questions.map(q => ({
      Question_Text__c  : q.text,
      Is_Control_c__c   : q.isControl,
      Is_MultiSelect__c : q.multi,
      Choices__c        : q.choices
                          .map(c => String(c.value || '').trim())
                          .filter(v => v)
                          .join(';'),
      Correct_Choice__c : q.isControl
                          ? String(q.choices.find(c => c.isCorrect)?.value || '').trim()
                          : ''
    }));

    console.log('== DEBUG questions ==');
    console.log(JSON.stringify(questions, null, 2));

    this.isSaving = true;
    saveSurvey({ survey, questions })
      .then(() => {
        this.toast('Success', 'Survey saved', 'success');
        this.title = this.description = this.endDate = this.selectedCategoryId = '';
        this.questions = [
          {
            id: 1,
            text: '',
            multi: false,
            isControl: false,
            radioGroupName: 'correct-1',
            choices: [{ id: uid(), value: '', isCorrect: false }]
          }
        ];
      })
      .catch(err => {
        this.toast('Error', err.body?.message || err.message, 'error');
      })
      .finally(() => { this.isSaving = false; });
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
