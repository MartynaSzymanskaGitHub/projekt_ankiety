public class SurveyReminderBatch implements Database.Batchable<SObject> {

    public Database.QueryLocator start(Database.BatchableContext bc) {
        DateTime startOfDay = DateTime.newInstance(Date.today().addDays(1), Time.newInstance(0, 0, 0, 0));
        DateTime endOfDay = startOfDay.addDays(1);

        return Database.getQueryLocator([
            SELECT Id, Title_c__c, End_Date__c
            FROM Survey_PROJ__c
            WHERE End_Date__c >= :startOfDay AND End_Date__c < :endOfDay
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Survey_PROJ__c> surveys) {
    for (Survey_PROJ__c survey : surveys) {
        survey = [
            SELECT Id, Title_c__c, End_Date__c, Category_PROJ__r.Allowed_For__c
            FROM Survey_PROJ__c
            WHERE Id = :survey.Id
            LIMIT 1
        ];

        String allowedRole = (survey.Category_PROJ__r != null) ? survey.Category_PROJ__r.Allowed_For__c : null;

        List<Response_PROJ__c> responses = [
            SELECT User_Login__c FROM Response_PROJ__c
            WHERE Survey__c = :survey.Id
        ];

        Set<Id> respondedIds = new Set<Id>();
        for (Response_PROJ__c r : responses) {
            if (r.User_Login__c != null) {
                respondedIds.add(r.User_Login__c);
            }
        }

        List<User_Login__c> users;
        if (allowedRole != null) {
            users = [
                SELECT Name, Role__c FROM User_Login__c
                WHERE Id NOT IN :respondedIds
                AND Role__c = :allowedRole
            ];
        } else {
            users = [
                SELECT Name, Role__c FROM User_Login__c
                WHERE Id NOT IN :respondedIds
            ];
        }

        String userList = '';
        for (User_Login__c user : users) {
            userList += '- ' + user.Name + '\n';
        }

        String body = 'Przypomnienie: Ankieta "' + survey.Title_c__c + '" kończy się jutro (' +
            survey.End_Date__c.format() + ').\n\n';

        if (!users.isEmpty()) {
            body += 'Użytkownicy, którzy jeszcze nie wypełnili ankiety:\n' + userList;
        } else {
            body += 'Wszyscy użytkownicy już wypełnili tę ankietę.';
        }

        System.debug('Treść maila:\n' + body); 

        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { '245938@edu.p.lodz.pl' });
            mail.setSubject('Ankieta kończy się jutro: ' + survey.Title_c__c);
            mail.setPlainTextBody(body);

            OrgWideEmailAddress[] addresses = [
                SELECT Id FROM OrgWideEmailAddress WHERE Address = '245938@edu.p.lodz.pl' LIMIT 1
            ];
            if (!addresses.isEmpty()) {
                mail.setOrgWideEmailAddressId(addresses[0].Id);
            }

            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } catch (Exception e) {
            System.debug('Błąd podczas wysyłki maila: ' + e.getMessage());
        }
     }
    }

    public void finish(Database.BatchableContext bc) {}
}
