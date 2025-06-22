public with sharing class AdminUserPanelController {

    @AuraEnabled(cacheable=true)
    public static List<User_Login__c> getAllUsers() {
        return [
            SELECT Id, Name, Email__c, Role__c, Is_Active__c
            FROM User_Login__c
            ORDER BY Name
        ];
    }

    @AuraEnabled
    public static void updateUserStatus(String userId, Boolean isActive) {
        User_Login__c user = [SELECT Id, Is_Active__c FROM User_Login__c WHERE Id = :userId LIMIT 1];
        user.Is_Active__c = isActive;
        update user;
    }

    @AuraEnabled
    public static void updateUserRole(String userId, String role) {
        if (role != 'Admin' && role != 'User') {
            throw new AuraHandledException('Dozwolone role to tylko "Admin" i "User".');
        }
        User_Login__c user = [SELECT Id, Role__c FROM User_Login__c WHERE Id = :userId LIMIT 1];
        user.Role__c = role;
        update user;
    }
}
