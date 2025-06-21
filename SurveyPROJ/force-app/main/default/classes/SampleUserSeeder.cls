public with sharing class SampleUserSeeder {
    @InvocableMethod
    public static void createSampleUsers(List<String> input) {

        List<User_Login__c> users = new List<User_Login__c>{
            new User_Login__c(
                Name = 'admin',
                Password__c = 'admin123',
                Role__c = 'Admin',
                Email__c = 'martynaszymanska02@gmail.com'
            ),
            new User_Login__c(
                Name = 'user1',
                Password__c = 'user123',
                Role__c = 'User',
                Email__c = '245958@edu.p.lodz.pl'
            ),
            new User_Login__c(
                Name = 'user2',
                Password__c = 'user456',
                Role__c = 'User',
                Email__c = 'kamilwinczewski52@gmail.com'
            ),
            new User_Login__c(
                Name = 'worker1',
                Password__c = 'worker123',
                Role__c = 'Worker',
                Email__c = 'martynaszy02@gmail.com'
            )
        };
        insert users;
    }
}
