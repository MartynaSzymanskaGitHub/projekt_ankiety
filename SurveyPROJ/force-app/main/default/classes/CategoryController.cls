public with sharing class CategoryController {
    @AuraEnabled
    public static List<User_Login__c> getAllUserLogins() {
        return [SELECT Id, Name FROM User_Login__c WHERE Name != 'admin'
         ORDER BY Name];
    }

    @AuraEnabled(cacheable=true)
    public static List<Category_PROJ__c> getAllCategories() {
        return [SELECT Id, Name FROM Category_PROJ__c ORDER BY Name];
    }

@AuraEnabled
public static Id saveCategory(String name, List<Id> userLoginIds) {
    if (String.isBlank(name))
        throw new AuraHandledException('Empty category name.');

    List<Category_PROJ__c> existing = [
        SELECT Id FROM Category_PROJ__c
        WHERE Name = :name
        LIMIT 1
    ];
    if (!existing.isEmpty()) {
         throw new AuraHandledException('Another category with this name already exists.');
    }

    Category_PROJ__c cat = new Category_PROJ__c(Name = name);
    insert cat;
    upsertUserLinks(cat.Id, userLoginIds);
    return cat.Id;
}


@AuraEnabled
public static void updateCategory(Id catId, String name, List<Id> userLoginIds) {
    List<Category_PROJ__c> duplicates = [
        SELECT Id FROM Category_PROJ__c
        WHERE Name = :name AND Id != :catId
        LIMIT 1
    ];
    if (!duplicates.isEmpty()) {
        throw new AuraHandledException('Another category with this name already exists.');
    }
    Category_PROJ__c cat = [
        SELECT Id, Name
        FROM Category_PROJ__c
        WHERE Id = :catId
        LIMIT 1
    ];
    cat.Name = name;
    update cat;
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
            throw new AuraHandledException('Cannot delete department related with survey.');
        delete [SELECT Id FROM User_Category_PROJ__c WHERE Category_PROJ__c = :catId];
        delete new Category_PROJ__c(Id = catId);
    }

private static void upsertUserLinks(Id catId, List<Id> userLoginIds) {
    List<User_Login__c> users = [
        SELECT Id, Name
        FROM User_Login__c
        WHERE Id IN :userLoginIds
    ];

    for (User_Login__c user : users) {
        if (user.Name != null && user.Name.toLowerCase() == 'admin') {
            throw new AuraHandledException('The user "admin" cannot be assigned to a category.');
        }
    }

    delete [
        SELECT Id 
        FROM User_Category_PROJ__c 
        WHERE Category_PROJ__c = :catId
    ];

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
