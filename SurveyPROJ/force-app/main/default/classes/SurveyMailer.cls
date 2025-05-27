public with sharing class SurveyMailer {
    public static void sendSurveyNotification(Survey_PROJ__c survey) {
        String toAddress = '245938@edu.p.lodz.pl'; 

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[] { toAddress });
        mail.setSubject(' New Survey: ' + survey.Title_c__c);

        String endDateStr = survey.End_Date__c != null
            ? String.valueOf(survey.End_Date__c.format())
            : 'no deadline set';

        String body = 'A new survey titled "' + survey.Title_c__c + '" has been created.\n'
            + 'It can be filled out until: ' + endDateStr + '.\n\n'
            + 'Log in to the application to view and complete it.';

        mail.setPlainTextBody(body);

        OrgWideEmailAddress[] addresses = [
            SELECT Id FROM OrgWideEmailAddress
            WHERE Address = '245938@edu.p.lodz.pl'
            LIMIT 1
        ];
        if (!addresses.isEmpty()) {
            mail.setOrgWideEmailAddressId(addresses[0].Id);
        }

        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
    }
}
