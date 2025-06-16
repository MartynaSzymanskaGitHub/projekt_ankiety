public with sharing class CategoryController {

 @AuraEnabled
    public static void saveCategory(String name, List<String> allowedRoles) {
        if (String.isBlank(name)) {
            throw new AuraHandledException('Nazwa kategorii nie może być pusta.');
        }
        String joinedRoles = String.join(allowedRoles, ';');

        List<Category_PROJ__c> duplicates = [
            SELECT Id FROM Category_PROJ__c
            WHERE Name = :name AND Allowed_For__c = :joinedRoles
            LIMIT 1
        ];

        if (!duplicates.isEmpty()) {
            throw new AuraHandledException('Taka kategoria z tymi rolami już istnieje.');
        }


        Category_PROJ__c cat = new Category_PROJ__c();
        cat.Name           = name;
        cat.Allowed_For__c = String.join(allowedRoles, ';');
        insert cat;
        UserCategoryService.assignCategoryToUsers(cat.Id, allowedRoles);
    }

    @AuraEnabled
    public static void deleteCategory(Id catId) {
        Integer cnt = [SELECT COUNT() FROM Survey_PROJ__c WHERE Category_PROJ__c = :catId];
        if (cnt > 0) {
            throw new AuraHandledException('Nie można usunąć – kategoria użyta w ankietach.');
        }
        delete new Category_PROJ__c(Id = catId);
    }

    @AuraEnabled(cacheable=true)
    public static List<Category_PROJ__c> getAllCategories() {
        return [SELECT Id, Name, Allowed_For__c FROM Category_PROJ__c ORDER BY Name];
    }

}
