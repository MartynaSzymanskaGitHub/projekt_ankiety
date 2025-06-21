public with sharing class CategoryController {

    @AuraEnabled
    public static void saveCategory(String name, List<Id> userLoginIds) {
        if (String.isBlank(name)) {
            throw new AuraHandledException('Nazwa kategorii nie może być pusta.');
        }

        List<Category_PROJ__c> duplicates = [
            SELECT Id FROM Category_PROJ__c WHERE Name = :name LIMIT 1
        ];

        if (!duplicates.isEmpty()) {
            throw new AuraHandledException('Taka kategoria już istnieje.');
        }

        Category_PROJ__c cat = new Category_PROJ__c(Name = name);
        insert cat;

        List<User_Category_PROJ__c> assignments = new List<User_Category_PROJ__c>();
        for (Id userLoginId : userLoginIds) {
            assignments.add(new User_Category_PROJ__c(
                Category_PROJ__c = cat.Id,
                User__c = userLoginId
            ));
        }
        insert assignments;
    }

    @AuraEnabled
    public static void deleteCategory(Id catId) {
        Integer cnt = [SELECT COUNT() FROM Survey_PROJ__c WHERE Category_PROJ__c = :catId];
        if (cnt > 0) {
            throw new AuraHandledException('Nie można usunąć – kategoria użyta w ankietach.');
        }

        delete [SELECT Id FROM User_Category_PROJ__c WHERE Category_PROJ__c = :catId];
        delete new Category_PROJ__c(Id = catId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Category_PROJ__c> getAllCategories() {
        return [SELECT Id, Name FROM Category_PROJ__c ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<User_Login__c> getAllUserLogins() {
        return [SELECT Id, Name FROM User_Login__c ORDER BY Name];
    }
}
