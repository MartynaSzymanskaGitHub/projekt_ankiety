import { LightningElement, track } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getControlQuestionStats from '@salesforce/apex/SurveyController.getControlQuestionStats';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class SurveyControlStats extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track totalCorrect = 0;
  @track totalIncorrect = 0;
  isAuthorized = false;
  showChart = false;

  connectedCallback() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.Role__c !== 'Admin') {
      alert('Tylko administrator ma dostęp do statystyk pytań kontrolnych.');
      window.location.href = '/lightning/n/Login';
      return;
    }
    this.isAuthorized = true;

    getAllSurveys()
      .then(data => {
        this.surveyOptions = data.map(s => ({
          label: s.Title_c__c,
          value: s.Id
        }));
      })
      .catch(error => {
        this.toast('Błąd', error.body?.message || error.message, 'error');
      });
  }

  // Pomocnicza funkcja do logiki tworzenia pytań w innym komponencie
  isControlDisabled(questionId) {
    return questionId % 5 !== 0;
  }

  get showNoStatsMessage() {
    return this.selectedSurveyId && !this.showChart;
  }

  handleSurveyChange(event) {
    this.selectedSurveyId = event.detail.value;
    this.showChart = false;

    getControlQuestionStats({ surveyId: this.selectedSurveyId })
      .then(data => {
        let correct = 0;
        let incorrect = 0;

        data.forEach(row => {
          correct += row.correctCount || 0;
          incorrect += row.incorrectCount || 0;
        });

        this.totalCorrect = correct;
        this.totalIncorrect = incorrect;

        this.showChart = true;
      })
      .catch(error => {
        this.toast('Błąd', error.body?.message || error.message, 'error');
      });
  }

  renderedCallback() {
    if (this.showChart) {
      const canvas = this.template.querySelector('canvas');
      if (canvas) {
        this.renderSimpleChart(canvas);
      }
    }
  }

  renderSimpleChart(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const labels = ['Poprawne', 'Niepoprawne'];
    const values = [this.totalCorrect, this.totalIncorrect];
    const colors = ['#28a745', '#dc3545'];
    const max = Math.max(...values, 1);
    const barWidth = 100;
    const spacing = 200;
    const baseY = 250;
    const scale = 200 / max;

    labels.forEach((label, i) => {
      const x = 100 + i * spacing;
      const height = values[i] * scale;

      ctx.fillStyle = colors[i];
      ctx.fillRect(x, baseY - height, barWidth, height);

      ctx.fillStyle = '#000';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(values[i], x + barWidth / 2, baseY - height - 10);
      ctx.fillText(label, x + barWidth / 2, baseY + 20);
    });
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
