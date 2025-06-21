import { LightningElement, api } from 'lwc';
import ChartJs from '@salesforce/resourceUrl/chartJs';
import { loadScript } from 'lightning/platformResourceLoader';
import getGlobalSurveyResultsByRole from '@salesforce/apex/SurveyController.getGlobalSurveyResultsByRole';

export default class SurveyRoleChart extends LightningElement {
    @api chartData; // <- możesz zostawić, żeby nie wywalało błędu
    chart;
    chartInitialized = false;

    renderedCallback() {
        if (this.chartInitialized) return;
        this.chartInitialized = true;

        loadScript(this, ChartJs)
            .then(() => this.initChart())
            .catch(error => console.error('Chart.js failed to load', error));
    }

    initChart() {
        getGlobalSurveyResultsByRole()
            .then(data => {
                if (!data || data.length === 0) return;

                const ctx = this.template.querySelector('canvas').getContext('2d');
                this.chart = new window.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(e => e.role),
                        datasets: [{
                            label: 'Wypełnione ankiety wg roli',
                            data: data.map(e => e.count),
                            backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Błąd pobierania danych z Apex:', error);
            });
    }
}
