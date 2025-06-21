public with sharing class LoginController {
    @AuraEnabled(cacheable=false)
    public static User_Login__c login(String username, String password) {
        List<User_Login__c> users = [
            SELECT Id, Name, Email__c, Password__c, Role__c
            FROM User_Login__c
            WHERE Name = :username
            LIMIT 1
        ];

        if (users.isEmpty()) {
            throw new AuraHandledException('Użytkownik nie istnieje.');
        }

        User_Login__c user = users[0];
        if (user.Password__c != password) {
            throw new AuraHandledException('Niepoprawne hasło.');
        }

        return user;
    }

    @AuraEnabled
    public static void registerUser(String name, String email, String password) {
        if (!Pattern.matches('^[A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ ]+$', name)) {
            throw new AuraHandledException('Name can only contain letters and spaces.');
        }

        if (password == null || password.length() < 8 ||
            !Pattern.matches('.*\\d.*', password) ||               
            !Pattern.matches('.*[!@#$%^&*()_+=\\[\\]{};:<>|./?~-].*', password)) {
            throw new AuraHandledException('Password must be at least 8 characters long and contain at least one number and one special character.');
        }

        List<User_Login__c> existing = [SELECT Id FROM User_Login__c WHERE Email__c = :email LIMIT 1];
        if (!existing.isEmpty()) {
            throw new AuraHandledException('A user with this email address already exists.');
        }

        User_Login__c newUser = new User_Login__c(
            Name = name,
            Email__c = email,
            Password__c = password,
            Role__c = 'User'
        );
        insert newUser;

        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { email });
            mail.setSubject('Your account has been created in the Survey App');
            mail.setPlainTextBody('Hello ' + name + ',\n\nYour account has been successfully created in the Survey App.\n\nThank you for registering!');
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } catch (Exception e) {
            System.debug('Email sending failed: ' + e.getMessage());
        }
    }
}
