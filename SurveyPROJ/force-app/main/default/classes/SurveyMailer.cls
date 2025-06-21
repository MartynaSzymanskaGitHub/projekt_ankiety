public with sharing class SurveyMailer {
    public static void sendSurveyNotification(Survey_PROJ__c survey) {
        Survey_PROJ__c s = [
            SELECT Id, Title_c__c, End_Date__c, Category_PROJ__c
            FROM Survey_PROJ__c
            WHERE Id = :survey.Id
            LIMIT 1
        ];

        List<User_Category_PROJ__c> links = [
            SELECT User__r.Email__c
            FROM User_Category_PROJ__c
            WHERE Category_PROJ__c = :s.Category_PROJ__c
        ];
        Set<String> toAddrs = new Set<String>();
        for (User_Category_PROJ__c link : links) {
            if (link.User__r.Email__c != null) {
                toAddrs.add(link.User__r.Email__c);
            }
        }
        if (toAddrs.isEmpty()) {
            return;
        }

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new List<String>(toAddrs));
        mail.setSubject('New Survey Available: ' + s.Title_c__c);
        
        String deadline = s.End_Date__c != null
            ? s.End_Date__c.format()
            : 'no deadline set';
        String body =
            'A new survey titled "' + s.Title_c__c + '" has been created.\n' +
            'It can be completed until: '  + deadline            + '.\n\n' +
            'Please log in to your account to view and complete the survey.';

        mail.setPlainTextBody(body);

        OrgWideEmailAddress[] ow = [
            SELECT Id
            FROM OrgWideEmailAddress
            WHERE Address = '245938@edu.p.lodz.pl'
            LIMIT 1
        ];
        if (!ow.isEmpty()) {
            mail.setOrgWideEmailAddressId(ow[0].Id);
        }

        Messaging.sendEmail(new Messaging.SingleEmailMessage[]{ mail });
    }
}
