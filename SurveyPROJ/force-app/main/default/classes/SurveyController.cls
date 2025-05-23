public with sharing class SurveyController {
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


        public class OptionStat {
        @AuraEnabled public String  questionText;
        @AuraEnabled public String  choice;
        @AuraEnabled public Integer count;
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
    public static void deleteSurvey(Id surveyId) 
    { delete new Survey_PROJ__c(Id = surveyId); }



    @AuraEnabled
    public static Survey_PROJ__c saveSurvey(
        Survey_PROJ__c survey,
        List<Question_PROJ__c> questions
    ) {
        upsert survey;
        for (Question_PROJ__c q : questions) {
            q.Survey__c = survey.Id;
        }
        upsert questions;
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
    public static void submitResponses(List<Response_PROJ__c> responses) {
        insert responses;   // bez ustawiania Name – Auto Number zrobi to samo
    }


}
