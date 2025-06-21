import { LightningElement, track } from 'lwc';
import ChartJs from '@salesforce/resourceUrl/chartJs';
import { loadScript } from 'lightning/platformResourceLoader';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getControlQuestionStats from '@salesforce/apex/SurveyController.getControlQuestionStats';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ControlStatsChart extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId = '';
  @track isEmpty = false;
  @track showChart = false;
  @track isAuthorized = false;

  chart;
  isChartJsLoaded = false;

  connectedCallback() {
    const inBuilder = window.location.href.includes('flexipageEditor');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user && !inBuilder) {
      window.location.href = '/lightning/n/Login';
      return;
    }
    
    if (user.Role__c !== 'Admin') {
      alert('Unauthorized role. Sending to loading page...');
      localStorage.removeItem('user');
      window.location.href = '/lightning/n/Login'; 
    }
      this.isAuthorized = true;

    getAllSurveys()
      .then(list => {
        if (!list || list.length === 0) {
          this.isEmpty = true;
          return;
        }
        this.isEmpty = false;
        this.surveyOptions = list.map(s => ({
          label: s.Title_c__c,
          value: s.Id
        }));
      })
      .catch(err => {
        this.showToast('Błąd ładowania ankiet', err.body?.message || err.message, 'error');
      });
  }

  renderedCallback() {
    if (this.isChartJsLoaded) return;
    this.isChartJsLoaded = true;

    loadScript(this, ChartJs)
      .catch(err => {
        this.showToast('Błąd ładowania Chart.js', err.body?.message || err.message, 'error');
      });
  }

  get hasSurveys() {
    return this.surveyOptions && this.surveyOptions.length > 0;
  }

  get showNoDataMessage() {
    return this.selectedSurveyId && !this.showChart;
  }

handleSurveyChange(event) {
  this.selectedSurveyId = event.detail.value;
  this.showChart = false;
  this.chart?.destroy();

  getControlQuestionStats({ surveyId: this.selectedSurveyId })
    .then(data => {
      let correctCount = 0;
      let incorrectCount = 0;
      data.forEach(row => {
        correctCount += row.correctCount || 0;
        incorrectCount += row.incorrectCount || 0;
      });

      if (correctCount + incorrectCount > 0) {
        this.showChart = true;

        Promise.resolve().then(() => {
          this._renderChart(correctCount, incorrectCount);
        });
      } else {
        this.showChart = false;
      }
    })
    .catch(err => {
      this.showToast('Błąd ładowania statystyk', err.body?.message || err.message, 'error');
    });
}


  _renderChart(correctCount, incorrectCount) {
    const canvas = this.template.querySelector('canvas.chart-canvas');
    const ctx = canvas.getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Poprawne', 'Niepoprawne'],
        datasets: [{
          label: 'Liczba odpowiedzi',
          data: [correctCount, incorrectCount],
          backgroundColor: ['#42A5F5', '#EF5350']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Typ odpowiedzi'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Ilość'
            },
            ticks: {
              precision: 0
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      }
    });
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({ title, message, variant })
    );
  }
}
