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
          '#4CAF50', // zieleń dla “Wypełnione”
          '#F44336'  // czerwień dla “Niewypełnione”
        ],
        hoverBackgroundColor: [
          '#4CAF50AA', // półprzezroczysta zieleń na hover
          '#F44336AA'  // półprzezroczysta czerwień na hover
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

        // ustawiasz etykiety i dane
        this.chart.data.labels = ['Wypełnione', 'Niewypełnione'];
        this.chart.data.datasets[0].data = [completedUsers, notCompletedUsers];

        // (opcjonalnie) nadpisz kolory dynamicznie, jeśli potrzebujesz
        this.chart.data.datasets[0].backgroundColor = [
          '#4CAF50', // zieleń
          '#F44336'  // czerwień
        ];

        this.chart.update();
      })
      .catch(error => console.error(error));
}

}
