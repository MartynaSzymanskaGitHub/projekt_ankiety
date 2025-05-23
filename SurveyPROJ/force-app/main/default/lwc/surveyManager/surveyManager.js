import { LightningElement, track, wire } from 'lwc';
import getAllSurveys from '@salesforce/apex/SurveyController.getAllSurveys';
import deleteSurvey  from '@salesforce/apex/SurveyController.deleteSurvey';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class SurveyManager extends LightningElement {
  @track surveys;
  wiredSurveys;

  columns = [
    { label: 'Title', fieldName: 'Title_c__c' },
    { label: 'Description', fieldName: 'Description__c' },
    {
      type: 'action',
      typeAttributes: {
        rowActions: [{ label: 'Delete', name: 'delete', iconName: 'utility:delete' }]
      }
    }
  ];

  /* pobierz ankiety */
  @wire(getAllSurveys)
  wiredResult(result) {
    this.wiredSurveys = result;
    if (result.data) this.surveys = result.data;
  }

  /* akcja wiersza */
  handleRowAction(event) {
    const { name } = event.detail.action;
    const surveyId  = event.detail.row.Id;

    if (name === 'delete') {
      deleteSurvey({ surveyId })
        .then(() => {
          this.toast('Success', 'Survey deleted', 'success');
          refreshApex(this.wiredSurveys);
        })
        .catch(err => {
          this.toast('Error', err.body?.message || err, 'error');
        });
    }
  }

  toast(title, message, variant) {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }
}
