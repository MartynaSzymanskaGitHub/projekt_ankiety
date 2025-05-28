import { LightningElement, track } from 'lwc';
import getFilledSurveys from '@salesforce/apex/SurveyController.getFilledSurveys';
import submitSurveyRating from '@salesforce/apex/SurveyController.submitSurveyRating';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SurveyRatingTab extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track rating = '';
  @track isEmpty = false;
  userLoginId;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      this.isEmpty = true;
      this.showToast('Błąd', 'Nie znaleziono danych użytkownika. Zaloguj się ponownie.', 'error');
      return;
    }

    this.userLoginId = user.Id;

    getFilledSurveys({ userLoginId: this.userLoginId })
      .then(data => {
        if (data.length === 0) {
          this.isEmpty = true;
        } else {
          this.surveyOptions = data.map(s => ({
            label: s.Title_c__c,
            value: s.Id
          }));
        }
      })
      .catch(error => {
        this.showToast('Błąd', error.body?.message || error.message, 'error');
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
