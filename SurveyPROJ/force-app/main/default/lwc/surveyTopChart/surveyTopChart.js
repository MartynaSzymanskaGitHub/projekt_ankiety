import { LightningElement, track } from 'lwc';
import getTop3RatedSurveysDynamic
    from '@salesforce/apex/SurveyController.getTop3RatedSurveysDynamic';

export default class SurveyTopChart extends LightningElement {

    /** dane do wyświetlenia */
    @track bars = [];          // [{ title, avgRating, style }] – zbudujemy niżej
    @track jsonDebug = '';

    /** pobieramy z Apeksa zaraz po wpięciu do DOM */
    connectedCallback() {
        getTop3RatedSurveysDynamic()
            .then(raw => {
                const surveys = JSON.parse(JSON.stringify(raw));   // plain JSON
                this.jsonDebug = JSON.stringify(surveys, null, 2);

                /* filtr + mapowanie do obiektów dla szablonu */
                const cleaned = surveys
                    .filter(s => s.title && s.avgRating != null)
                    .map(s => ({
                        title     : s.title,
                        avgRating : Number(s.avgRating),
                        /* szerokość paska = procent maksymalnej oceny (5) */
                        style     : `width:${(Number(s.avgRating) / 5) * 100}%`
                    }));

                this.bars = cleaned;
            })
            .catch(err => {
                console.error('Apex error:', err);
                this.jsonDebug = JSON.stringify(err, null, 2);
            });
    }
}
