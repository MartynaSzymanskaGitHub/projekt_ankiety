public class SurveyReminderBatch implements Database.Batchable<SObject> {

    public Database.QueryLocator start(Database.BatchableContext bc) {
        DateTime startOfTomorrow = DateTime.newInstance(
            Date.today().addDays(1),
            Time.newInstance(0,0,0,0)
        );
        DateTime endOfTomorrow = startOfTomorrow.addDays(1);

        return Database.getQueryLocator([
            SELECT Id, Title_c__c, End_Date__c, Category_PROJ__c
            FROM Survey_PROJ__c
            WHERE End_Date__c >= :startOfTomorrow
              AND End_Date__c <  :endOfTomorrow
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Survey_PROJ__c> surveys) {
        for (Survey_PROJ__c survey : surveys) {
            Set<Id> respondedIds = new Set<Id>();
            for (Response_PROJ__c r : [
                SELECT User_Login__c
                FROM Response_PROJ__c
                WHERE Question_PROJ__r.Survey__c = :survey.Id
            ]) {
                if (r.User_Login__c != null) {
                    respondedIds.add(r.User_Login__c);
                }
            }

            List<User_Category_PROJ__c> assignments = [
                SELECT User__c, User__r.Name, User__r.Email__c
                FROM User_Category_PROJ__c
                WHERE Category_PROJ__c = :survey.Category_PROJ__c
            ];

            Set<String> toEmails = new Set<String>();
            List<String> userLines = new List<String>();
            for (User_Category_PROJ__c link : assignments) {
                if (link.User__r.Email__c != null
                    && !respondedIds.contains(link.User__c)) 
                {
                    toEmails.add(link.User__r.Email__c);
                    userLines.add('- ' + link.User__r.Name);
                }
            }

            if (toEmails.isEmpty()) {
                continue;
            }

            String subject = 'Survey ends tomorrow: ' + survey.Title_c__c;
            String body =
                'Reminder: the survey "' + survey.Title_c__c +
                '" ends tomorrow (' + survey.End_Date__c.format() + ').\n\n';


            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new List<String>(toEmails));
            mail.setSubject(subject);
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

            try {
                Messaging.sendEmail(new Messaging.SingleEmailMessage[]{ mail });
            } catch (Exception e) {
                System.debug('Error sending reminder email for survey ' 
                             + survey.Id + ': ' + e.getMessage());
            }
        }
    }

    public void finish(Database.BatchableContext bc) {
    }
}
