import { LightningElement, api } from 'lwc';
import ChartJs from '@salesforce/resourceUrl/chartJs';
import { loadScript } from 'lightning/platformResourceLoader';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import getSurveyCompletionByDepartment from '@salesforce/apex/SurveyController.getSurveyCompletionByDepartment';

export default class SurveyRoleChart extends LightningElement {
    @api selectedSurveyId;
    @api chartData;
    chart;
    surveys = [];
    surveyOptions = [];
    chartInitialized = false;

    connectedCallback() {
        getAllSurveys().then(data => {
            this.surveys = data;
            this.surveyOptions = data.map(s => ({ label: s.Title_c__c, value: s.Id }));
        });
    }

    renderedCallback() {
        if (this.chartInitialized) return;
        this.chartInitialized = true;

        loadScript(this, ChartJs)
            .then(() => this.initChart())
            .catch(error => console.error('Chart.js failed to load', error));
    }

    handleSurveyChange(e) {
        this.selectedSurveyId = e.detail.value;
        this.updateChart();
    }

    initChart() {
  const ctx = this.template.querySelector('canvas').getContext('2d');
  this.chart = new window.Chart(ctx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          '#4CAF50', 
          '#F44336'  
        ],
        hoverBackgroundColor: [
          '#4CAF50AA', 
          '#F44336AA'  
        ],
        borderColor: ['#FFFFFF','#FFFFFF'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}


updateChart() {
    if (!this.selectedSurveyId) return;

    getSurveyCompletionByDepartment({ surveyId: this.selectedSurveyId })
      .then(data => {
        const { completedUsers, notCompletedUsers } = data[0];

        this.chart.data.labels = ['Not filled', 'Filled'];
        this.chart.data.datasets[0].data = [notCompletedUsers, completedUsers];

        this.chart.data.datasets[0].backgroundColor = [ 
          '#F44336',
          '#4CAF50'
        ];

        this.chart.data.datasets[0].hoverBackgroundColor = [
          '#F44336AA',
          '#4CAF50AA'
        ];

        this.chart.update();
      })
      .catch(error => console.error(error));
}


}
