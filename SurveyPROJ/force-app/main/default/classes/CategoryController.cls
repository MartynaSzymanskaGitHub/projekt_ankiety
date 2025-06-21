public with sharing class CategoryController {
    @AuraEnabled
    public static List<User_Login__c> getAllUserLogins() {
        return [SELECT Id, Name FROM User_Login__c ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<Category_PROJ__c> getAllCategories() {
        return [SELECT Id, Name FROM Category_PROJ__c ORDER BY Name];
    }

    @AuraEnabled
    public static Id saveCategory(String name, List<Id> userLoginIds) {
        if (String.isBlank(name))
            throw new AuraHandledException('Nazwa kategorii nie może być pusta.');
        Category_PROJ__c cat = new Category_PROJ__c(Name = name);
        insert cat;
        upsertUserLinks(cat.Id, userLoginIds);
        return cat.Id;
    }

    @AuraEnabled
    public static void updateCategory(Id catId, String name, List<Id> userLoginIds) {
        // 1) zmień nazwę
        Category_PROJ__c cat = [
            SELECT Id, Name
              FROM Category_PROJ__c
             WHERE Id = :catId
             LIMIT 1
        ];
        cat.Name = name;
        update cat;
        // 2) przełóż powiązania
        upsertUserLinks(catId, userLoginIds);
    }

    @AuraEnabled(cacheable=true)
    public static List<Id> getAssignedUserIds(Id catId) {
        List<Id> result = new List<Id>();
        for (User_Category_PROJ__c link : [
            SELECT User__c
              FROM User_Category_PROJ__c
             WHERE Category_PROJ__c = :catId
        ]) {
            result.add(link.User__c);
        }
        return result;
    }

    @AuraEnabled
    public static void deleteCategory(Id catId) {
        Integer cnt = [SELECT COUNT() FROM Survey_PROJ__c WHERE Category_PROJ__c = :catId];
        if (cnt > 0)
            throw new AuraHandledException('Nie można usunąć – kategoria użyta w ankietach.');
        delete [SELECT Id FROM User_Category_PROJ__c WHERE Category_PROJ__c = :catId];
        delete new Category_PROJ__c(Id = catId);
    }

    // helper
    private static void upsertUserLinks(Id catId, List<Id> userLoginIds) {
        // usuń stare
        delete [
          SELECT Id 
            FROM User_Category_PROJ__c 
           WHERE Category_PROJ__c = :catId
        ];
        // wstaw nowe
        List<User_Category_PROJ__c> toIns = new List<User_Category_PROJ__c>();
        for (Id u : userLoginIds) {
            toIns.add(new User_Category_PROJ__c(
                Category_PROJ__c = catId,
                User__c          = u
            ));
        }
        if (!toIns.isEmpty()) insert toIns;
    }
}
