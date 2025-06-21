import { LightningElement, wire, track } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getSurveyStats from '@salesforce/apex/SurveyController.getSurveyStats';
import { loadScript } from 'lightning/platformResourceLoader';
import chartjs from '@salesforce/resourceUrl/chartjs';

export default class SurveyResultsChart extends LightningElement {
  @track surveyOptions = [];
  @track selectedSurveyId;
  @track questionOptions = [];
  @track selectedQuestion;
  rawStats = [];
  chartJsInitialized = false;
  chart;

  renderedCallback() {
    if (this.chartJsInitialized) return;
    this.chartJsInitialized = true;

    loadScript(this, chartjs + '/chart.min.js')
      .then(() => console.log('Chart.js loaded'))
      .catch(error => console.error('Chart.js load error', error));
  }

  @wire(getAllSurveys)
  wiredSurveys({ data, error }) {
    if (data) {
      this.surveyOptions = data.map(s => ({
        label: s.Title_c__c,
        value: s.Id
      }));
    }
  }

  handleSurveyChange(event) {
    this.selectedSurveyId = event.detail.value;
    this.selectedQuestion = null;
    this.questionOptions = [];
    this.rawStats = [];

    getSurveyStats({ surveyId: this.selectedSurveyId })
      .then(data => {
        this.rawStats = data;
        const questions = [...new Set(data.map(d => d.questionText))];
        this.questionOptions = questions.map(q => ({ label: q, value: q }));
      })
      .catch(error => console.error(error));
  }

  handleQuestionChange(event) {
    this.selectedQuestion = event.detail.value;
    const data = this.rawStats.filter(item => item.questionText === this.selectedQuestion);
    this.renderChart(data);
  }

  renderChart(data) {
    const container = this.template.querySelector('.chart-container');
    container.innerHTML = '<canvas></canvas>';
    const canvas = container.querySelector('canvas');

    if (this.chart) this.chart.destroy();

    this.chart = new window.Chart(canvas, {
      type: 'pie',
      data: {
        labels: data.map(d => d.choice),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#FF7043']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.raw} osób`
            }
          },
          legend: { position: 'bottom' }
        }
      }
    });
  }
}
