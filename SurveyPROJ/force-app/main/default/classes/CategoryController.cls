/**  CategoryController.cls  **/
public with sharing class CategoryController {

    /* =====================================================
       ===============  ZAPIS KATEGORII  ====================
       ===================================================== */
    @AuraEnabled
    public static void saveCategory(String name, List<String> allowedRoles) {
        if (String.isBlank(name)) {
            throw new AuraHandledException('Nazwa kategorii nie może być pusta.');
        }

        /* 1. Unikalność nazwy */
        if (![SELECT Id FROM Category_PROJ__c WHERE Name = :name LIMIT 1].isEmpty()) {
            throw new AuraHandledException('Kategoria o tej nazwie już istnieje.');
        }

        /* 2. Insert kategorii */
        Category_PROJ__c cat = new Category_PROJ__c();
        cat.Name           = name;
        cat.Allowed_For__c = String.join(allowedRoles, ';');
        insert cat;

        /* 3. Przypisz tę kategorię wszystkim użytkownikom wskazanych ról
              (nadpisuje starszą wartość).                                     */
        autoAssignPreferredCategory(cat.Id, allowedRoles);
    }

    /* =====================================================
       Przypisuje Preferred_Category__c wszystkim User_Login__c
       o roli podanej w liście 'roles'.  Zawsze nadpisuje.   */
    private static void autoAssignPreferredCategory(Id catId, List<String> roles) {
        if (roles.isEmpty()) return;

        List<User_Login__c> toUpdate = [
            SELECT Id, Preferred_Category__c, Role__c
            FROM User_Login__c
            WHERE Role__c IN :roles
        ];

        for (User_Login__c ul : toUpdate) {
            ul.Preferred_Category__c = catId;
        }
        if (!toUpdate.isEmpty()) update toUpdate;
    }

    /* =====================================================
       =============  POBIERANIE KATEGORII  =================
       ===================================================== */
    @AuraEnabled(cacheable=true)
    public static List<Category_PROJ__c> getAllCategories() {
        return [SELECT Id, Name FROM Category_PROJ__c ORDER BY Name];
    }


@AuraEnabled
    public static void deleteCategory(Id catId) {
        // sprawdź, czy nie ma powiązanych ankiet
        Integer cnt = [
            SELECT COUNT() FROM Survey_PROJ__c WHERE Category_PROJ__c = :catId
        ];
        if (cnt > 0)
            throw new AuraHandledException('Nie można usunąć – kategoria użyta w ankietach.');

        delete new Category_PROJ__c(Id = catId);
    }

}
