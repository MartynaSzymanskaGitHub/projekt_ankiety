import { LightningElement, track } from 'lwc';
import getFilledSurveys from '@salesforce/apex/SurveyController.getFilledSurveys';
import submitSurveyRating from '@salesforce/apex/SurveyController.submitSurveyRating';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const ALLOWED_ROLES = ['User', 'Worker'];

export default class SurveyRatingTab extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track rating = '';
  @track isEmpty = false;
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
    this.userRole    = user.Role__c;

    if (!ALLOWED_ROLES.includes(this.userRole)) {
      alert('User and Worker can rate the surveys.');
      window.location.href = '/lightning/n/Login';
      return;
    }

    this.isAuthorized = true;
    this.loadSurveys();
  }

  loadSurveys() {
    getFilledSurveys({ userLoginId: this.userLoginId })
      .then(data => {
        if (!data || data.length === 0) {
          this.isEmpty = true;
          return;
        }
        this.isEmpty = false;
        this.surveyOptions = data.map(s => ({ label: s.Title_c__c, value: s.Id }));
      })
      .catch(err => {
        this.showToast('Błąd', err.body?.message || err.message, 'error');
      });
  }

  handleSurveyChange(event) {
    this.selectedSurveyId = event.detail.value;
  }

  handleRatingChange(event) {
    this.rating = event.detail.value;
  }

  handleSubmitRating() {
    const numericRating = parseInt(this.rating, 10);
    if (!this.selectedSurveyId || !numericRating || numericRating < 1 || numericRating > 5) {
      this.showToast('Błąd walidacji', 'Wybierz ankietę i ocenę od 1 do 5.', 'warning');
      return;
    }

    submitSurveyRating({
      surveyId: this.selectedSurveyId,
      rating: numericRating
    })
      .then(() => {
        this.showToast('Sukces', 'Ocena została zapisana.', 'success');
        this.rating = '';
        this.selectedSurveyId = '';
        window.location.reload();
      })
      .catch(error => {
        this.showToast('Błąd', error.body?.message || error.message, 'error');
      });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({ title, message, variant })
    );
  }
}
