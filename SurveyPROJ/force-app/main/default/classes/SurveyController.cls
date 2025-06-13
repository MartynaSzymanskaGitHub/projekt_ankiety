public with sharing class SurveyController {

    public class OptionStat {
        @AuraEnabled public String  questionText;
        @AuraEnabled public String  choice;
        @AuraEnabled public Integer count;
    }

    public class SurveyAverageRating {
        @AuraEnabled public String  title;
        @AuraEnabled public Decimal avgRating;

        public SurveyAverageRating(String title, Decimal avgRating) {
            this.title     = title;
            this.avgRating = avgRating;
        }
    }

    public class ControlAnswerStat {
        @AuraEnabled public String questionText;
        @AuraEnabled public Integer correctCount;
        @AuraEnabled public Integer incorrectCount;
    }


    @AuraEnabled(cacheable=true)
    public static List<SurveyAverageRating> getTop3RatedSurveysDynamic() {
        AggregateResult[] results = [
            SELECT Survey_PROJ__c,
                   Survey_PROJ__r.Title_c__c   title,
                   AVG(Rating__c)              avgRating
            FROM   SurveyRating_PROJ__c
            WHERE  Rating__c != null 
              AND Survey_PROJ__r.Title_c__c != null
            GROUP  BY Survey_PROJ__c, Survey_PROJ__r.Title_c__c
            ORDER  BY AVG(Rating__c) DESC
            LIMIT  3
        ];

        List<SurveyAverageRating> outList = new List<SurveyAverageRating>();
        for (AggregateResult r : results) {
            String title = (String) r.get('title');
            Decimal rating = (Decimal) r.get('avgRating');
            if (title != null && rating != null) {
                outList.add(new SurveyAverageRating(title, rating));
            }
        }
        return outList;
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
    public static List<Survey_PROJ__c> getSurveysForUser(Id userLoginId) {
        User_Login__c u = [
            SELECT Role__c
            FROM   User_Login__c
            WHERE  Id = :userLoginId
            LIMIT  1
        ];

        List<User_Category_PROJ__c> links = [
            SELECT Category_PROJ__c
            FROM   User_Category_PROJ__c
            WHERE  User__c = :userLoginId
        ];
        if (links.isEmpty()) {
            throw new AuraHandledException('Brak przypisanych kategorii.');
        }
        Set<Id> catIds = new Set<Id>();
        for (User_Category_PROJ__c l : links) {
            catIds.add(l.Category_PROJ__c);
        }

        return [
            SELECT Id, Title_c__c, End_Date__c,
                   Category_PROJ__c, Category_PROJ__r.Name
            FROM   Survey_PROJ__c
            WHERE  Category_PROJ__c IN :catIds
              AND  End_Date__c      >= TODAY
              AND  Category_PROJ__r.Allowed_For__c LIKE :('%' + u.Role__c + '%')
            ORDER  BY End_Date__c ASC
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
            Id   qid   = (Id)   r.get('qId');
            stat.questionText = questionMap.get(qid);
            stat.choice       = (String) r.get('choice');
            stat.count        = (Integer)r.get('c');
            out.add(stat);
        }
        return out;
    }

    @AuraEnabled 
    public static void deleteSurvey(Id surveyId) {
        delete new Survey_PROJ__c(Id = surveyId);
    }


    @AuraEnabled(cacheable=true)
    public static List<ControlAnswerStat> getControlQuestionStats(Id surveyId) {
        Map<Id, String> correctAnswers = new Map<Id, String>();
        Map<Id, String> questionTexts  = new Map<Id, String>();

        for (Question_PROJ__c q : [
            SELECT Id, Question_Text__c, Correct_Choice__c, Is_Control_c__c
            FROM Question_PROJ__c
            WHERE Survey__c = :surveyId
              AND Is_Control_c__c = true
        ]) {
            correctAnswers.put(q.Id, q.Correct_Choice__c);
            questionTexts.put(q.Id, q.Question_Text__c);
        }

        if (correctAnswers.isEmpty()) {
            return new List<ControlAnswerStat>();
        }

        List<AggregateResult> results = [
            SELECT Question_PROJ__c qid, Selected_Choice__c selected, COUNT(Id) cnt
            FROM Response_PROJ__c
            WHERE Question_PROJ__c IN :correctAnswers.keySet()
            GROUP BY Question_PROJ__c, Selected_Choice__c
        ];

        Map<Id, ControlAnswerStat> stats = new Map<Id, ControlAnswerStat>();
        for (AggregateResult ar : results) {
            Id    qid      = (Id)   ar.get('qid');
            String selected = (String) ar.get('selected');
            Integer cnt     = (Integer) ar.get('cnt');

            if (!stats.containsKey(qid)) {
                ControlAnswerStat stat = new ControlAnswerStat();
                stat.questionText   = questionTexts.get(qid);
                stat.correctCount   = 0;
                stat.incorrectCount = 0;
                stats.put(qid, stat);
            }

            String correct = correctAnswers.get(qid);
            if (selected == correct) {
                stats.get(qid).correctCount += cnt;
            } else {
                stats.get(qid).incorrectCount += cnt;
            }
        }
        return stats.values();
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
            if (q.Is_Control_c__c && String.isBlank(q.Correct_Choice__c)) {
                throw new AuraHandledException('Pytanie kontrolne musi mieć poprawną odpowiedź.');
            }
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
                   Is_MultiSelect__c,
                   Survey__r.End_Date__c,
                   Is_Control_c__c,
                   Correct_Choice__c
            FROM Question_PROJ__c
            WHERE Survey__c = :surveyId
        ];
    }


    @AuraEnabled
    public static void submitResponses(List<Response_PROJ__c> responses, Id userLoginId) {
        if (responses.isEmpty()) {
            throw new AuraHandledException('No responses to submit.');
        }
        Id surveyId = [
            SELECT Survey__c 
            FROM Question_PROJ__c 
            WHERE Id = :responses[0].Question_PROJ__c 
            LIMIT 1
        ].Survey__c;

        Survey_PROJ__c survey = [
            SELECT End_Date__c 
            FROM Survey_PROJ__c 
            WHERE Id = :surveyId 
            LIMIT 1
        ];
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
        Id currentUserLoginId = [
            SELECT Id 
            FROM User_Login__c 
            WHERE CreatedById = :UserInfo.getUserId() 
            LIMIT 1
        ].Id;

        List<SurveyRating_PROJ__c> existing = [
            SELECT Id 
            FROM SurveyRating_PROJ__c 
            WHERE Survey_PROJ__c = :surveyId 
              AND User_Login__c = :currentUserLoginId 
            LIMIT 1
        ];
        if (!existing.isEmpty()) {
            throw new AuraHandledException('Już oceniłeś tę ankietę.');
        }

        SurveyRating_PROJ__c newRating = new SurveyRating_PROJ__c();
        newRating.Survey_PROJ__c  = surveyId;
        newRating.User_Login__c  = currentUserLoginId;
        newRating.Rating__c      = rating;
        insert newRating;
    }


    @AuraEnabled(cacheable=true)
    public static List<Survey_PROJ__c> getFilledSurveys(Id userLoginId) {
        Set<Id> ratedSurveyIds = new Set<Id>();
        for (SurveyRating_PROJ__c sr : [
            SELECT Survey_PROJ__c 
            FROM SurveyRating_PROJ__c 
            WHERE User_Login__c = :userLoginId
        ]) {
            ratedSurveyIds.add(sr.Survey_PROJ__c);
        }

        Set<Id> filledSurveyIds = new Set<Id>();
        for (Response_PROJ__c r : [
            SELECT Question_PROJ__r.Survey__c 
            FROM Response_PROJ__c 
            WHERE User_Login__c = :userLoginId
        ]) {
            Id sid = r.Question_PROJ__r.Survey__c;
            if (!ratedSurveyIds.contains(sid)) {
                filledSurveyIds.add(sid);
            }
        }

        if (filledSurveyIds.isEmpty()) {
            return new List<Survey_PROJ__c>();
        }
        return [
            SELECT Id, Title_c__c, End_Date__c 
            FROM Survey_PROJ__c 
            WHERE Id IN :filledSurveyIds 
            ORDER BY Title_c__c
        ];
    }


    @AuraEnabled(cacheable=true)
    public static Decimal getAverageRating(Id surveyId) {
        AggregateResult result = [
            SELECT AVG(Rating__c) avgRating 
            FROM SurveyRating_PROJ__c 
            WHERE Survey_PROJ__c = :surveyId
        ];
        return (Decimal) result.get('avgRating');
    }

}
