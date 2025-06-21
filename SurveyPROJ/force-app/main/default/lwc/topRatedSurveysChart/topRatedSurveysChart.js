import { LightningElement, track } from 'lwc';
import getTopRatedSurveysByMonth from '@salesforce/apex/SurveyController.getTopRatedSurveysByMonth';
import { loadScript } from 'lightning/platformResourceLoader';
import chartjs from '@salesforce/resourceUrl/chartjs';

export default class TopRatedSurveysChart extends LightningElement {
  @track selectedMonth;
  chart;
  chartJsInitialized = false;

  monthOptions = this.generateMonthOptions();

  renderedCallback() {
    if (this.chartJsInitialized) return;
    this.chartJsInitialized = true;

    loadScript(this, chartjs + '/chart.min.js')
      .then(() => console.log('Chart.js loaded'))
      .catch(error => console.error('Chart.js load error', error));
  }

  generateMonthOptions() {
    const now = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const value = `${date.getMonth() + 1}-${date.getFullYear()}`; // e.g., "6-2025"
      months.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
    }
    return months;
  }

  handleMonthChange(event) {
    this.selectedMonth = event.detail.value;
    const [month, year] = this.selectedMonth.split('-').map(Number);

    getTopRatedSurveysByMonth({ month, year })
      .then(data => this.renderChart(data))
      .catch(error => console.error(error));
  }


renderChart(data) {
  const container = this.template.querySelector('.chart-container');
  container.innerHTML = '<canvas></canvas>';
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  if (this.chart) this.chart.destroy();

  const labels = data.map(item => item.title);
  const values = data.map(item => item.avgRating);

  this.chart = new window.Chart(ctx, {
    type: 'bar', 
    data: {
      labels: labels,
      datasets: [{
        label: 'Average survey rate',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
      }]
    },
    options: {
      indexAxis: 'y', 
      responsive: true,
      plugins: {
        tooltip: { enabled: true },
        legend: { display: true }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Average rating'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Survey'
          }
        }
      }
    }
  });
}



}
