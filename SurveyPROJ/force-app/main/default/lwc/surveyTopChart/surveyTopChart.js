import { LightningElement, track } from 'lwc';
import getTop3RatedSurveysDynamic
    from '@salesforce/apex/SurveyController.getTop3RatedSurveysDynamic';

export default class SurveyTopChart extends LightningElement {
    @track bars = [];        
    @track jsonDebug = '';

    connectedCallback() {
        getTop3RatedSurveysDynamic()
            .then(raw => {
                const surveys = JSON.parse(JSON.stringify(raw));   
                this.jsonDebug = JSON.stringify(surveys, null, 2);
                const cleaned = surveys
                    .filter(s => s.title && s.avgRating != null)
                    .map(s => ({
                        title     : s.title,
                        avgRating : Number(s.avgRating),
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
