public with sharing class SurveyController {

    public class OptionStat {
        @AuraEnabled public String  questionText;
        @AuraEnabled public String  choice;
        @AuraEnabled public Integer count;
    }

    @AuraEnabled(cacheable=true)
    public static List<Survey_PROJ__c> getAllSurveysWithSorting(Boolean ascending) {
        String direction = ascending ? 'ASC' : 'DESC';
        return Database.query(
            'SELECT Id, Title_c__c, End_Date__c ' +
            'FROM Survey_PROJ__c ' +
            'WHERE End_Date__c != null AND End_Date__c >= TODAY ' +
            'ORDER BY End_Date__c ' + direction
        );
    }

    @AuraEnabled(cacheable=true)
    public static List<Survey_PROJ__c> getAllSurveys() {
        return [
            SELECT Id, Title_c__c, End_Date__c
            FROM Survey_PROJ__c
            ORDER BY Title_c__c ASC
        ];
    }

    @AuraEnabled(cacheable=true)
    public static Boolean hasUserSubmitted(Id surveyId, Id userLoginId) {
        List<Response_PROJ__c> existingResponses = [
            SELECT Id
            FROM Response_PROJ__c
            WHERE User_Login__c = :userLoginId
            AND Question_PROJ__r.Survey__c = :surveyId
            LIMIT 1
        ];
        return !existingResponses.isEmpty();
    }


    @AuraEnabled(cacheable=true)
    public static List<OptionStat> getSurveyStats(Id surveyId) {
        Map<Id, String> questionMap = new Map<Id, String>();
        for (Question_PROJ__c q : [
            SELECT Id, Question_Text__c
            FROM Question_PROJ__c
            WHERE Survey__c = :surveyId
        ]) {
            questionMap.put(q.Id, q.Question_Text__c);
        }

        List<AggregateResult> results = [
            SELECT Question_PROJ__c qId, Selected_Choice__c choice, COUNT(Id) c
            FROM Response_PROJ__c
            WHERE Question_PROJ__r.Survey__c = :surveyId
            GROUP BY Question_PROJ__c, Selected_Choice__c
        ];

        List<OptionStat> out = new List<OptionStat>();
        for (AggregateResult r : results) {
            OptionStat stat = new OptionStat();
            Id qid = (Id) r.get('qId');
            stat.questionText = questionMap.get(qid);
            stat.choice = (String) r.get('choice');
            stat.count = (Integer) r.get('c');
            out.add(stat);
        }
        return out;
    }

    @AuraEnabled 
    public static void deleteSurvey(Id surveyId) {
        delete new Survey_PROJ__c(Id = surveyId);
    }

    @AuraEnabled
    public static Survey_PROJ__c saveSurvey(
        Survey_PROJ__c survey,
        List<Question_PROJ__c> questions
    ) {
        Boolean isNew = (survey.Id == null);
        upsert survey;

        for (Question_PROJ__c q : questions) {
            q.Survey__c = survey.Id;
        }
        upsert questions;

        if (isNew) {
            SurveyMailer.sendSurveyNotification(survey);
        }
        return survey;
    }

    @AuraEnabled(cacheable=true)
    public static List<Question_PROJ__c> getQuestions(Id surveyId) {
        return [
            SELECT Id,
                   Question_Text__c,
                   Choices__c,
                   Survey__r.End_Date__c
            FROM Question_PROJ__c
            WHERE Survey__c = :surveyId
        ];
    }

    @AuraEnabled
    public static void submitResponses(List<Response_PROJ__c> responses, Id userLoginId) {
        if (responses.isEmpty()) {
            throw new AuraHandledException('No responses to submit.');
        }

    Id surveyId = [SELECT Survey__c FROM Question_PROJ__c WHERE Id = :responses[0].Question_PROJ__c LIMIT 1].Survey__c;
    Survey_PROJ__c survey = [SELECT End_Date__c FROM Survey_PROJ__c WHERE Id = :surveyId LIMIT 1];

    if (survey.End_Date__c != null && survey.End_Date__c < System.now()) {
        throw new AuraHandledException('This survey has already expired.');
    }

    Boolean alreadySubmitted = [
        SELECT COUNT()
        FROM Response_PROJ__c
        WHERE Question_PROJ__r.Survey__c = :surveyId
        AND User_Login__c = :userLoginId
    ] > 0;

    if (alreadySubmitted) {
        throw new AuraHandledException('You have already submitted this survey.');
    }

    for (Response_PROJ__c r : responses) {
        r.User_Login__c = userLoginId;
    }

    insert responses;
}

@AuraEnabled
public static void submitSurveyRating(Id surveyId, Integer rating) {
    Id currentUser = [
        SELECT Id FROM User_Login__c WHERE CreatedById = :UserInfo.getUserId() LIMIT 1
    ].Id;

    List<Response_PROJ__c> responses = [
        SELECT Id FROM Response_PROJ__c
        WHERE Question_PROJ__r.Survey__c = :surveyId
        AND User_Login__c = :currentUser
    ];

    if (responses.isEmpty()) {
        throw new AuraHandledException('Nie znaleziono odpowiedzi do ocenienia.');
    }

    for (Response_PROJ__c r : responses) {
        r.Rating__c = rating;
    }

    update responses;
}



@AuraEnabled(cacheable=true)
public static List<Survey_PROJ__c> getFilledSurveys(Id userLoginId) {
    Set<Id> filledSurveyIds = new Set<Id>();
    
    for (Response_PROJ__c r : [
        SELECT Question_PROJ__r.Survey__c
        FROM Response_PROJ__c
        WHERE User_Login__c = :userLoginId
    ]) {
        filledSurveyIds.add(r.Question_PROJ__r.Survey__c);
    }

    return [SELECT Id, Title_c__c FROM Survey_PROJ__c WHERE Id IN :filledSurveyIds];
}





}
