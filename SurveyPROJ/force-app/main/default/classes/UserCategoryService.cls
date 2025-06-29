public with sharing class UserCategoryService {
    public static void assignCategoryToUsers(Id catId, List<String> roles) {
        if (roles.isEmpty()) return;

        Set<Id> alreadyLinked = new Set<Id>();
        for (User_Category_PROJ__c link :
                [SELECT User__c FROM User_Category_PROJ__c WHERE Category_PROJ__c = :catId]) {
            alreadyLinked.add(link.User__c);
        }

        List<User_Category_PROJ__c> toInsert = new List<User_Category_PROJ__c>();
        for (User_Login__c u : [
                SELECT Id
                FROM User_Login__c
                WHERE Role__c IN :roles
        ]) {
            if (!alreadyLinked.contains(u.Id)) {
                toInsert.add(new User_Category_PROJ__c(
                    User__c = u.Id,
                    Category_PROJ__c = catId
                ));
            }
        }
        if (!toInsert.isEmpty()) insert toInsert;
    }
}
