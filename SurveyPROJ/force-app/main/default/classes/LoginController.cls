public with sharing class LoginController {
    @AuraEnabled(cacheable=false)
    public static User_Login__c login(String username, String password) {
        List<User_Login__c> users = [
            SELECT Id, Name, Password__c, Role__c
            FROM User_Login__c
            WHERE Name = :username
            LIMIT 1
        ];

        if (users.isEmpty()) {
            throw new AuraHandledException('Użytkownik nie istnieje');
        }

        User_Login__c user = users[0];
        if (user.Password__c != password) {
            throw new AuraHandledException('Niepoprawne hasło');
        }

        return user;
    }
}
