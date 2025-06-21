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
public static List<RoleResponseCount> getGlobalSurveyResultsByRole() {
    List<RoleResponseCount> result = new List<RoleResponseCount>();

    AggregateResult[] grouped = [
        SELECT User_Login__r.Role__c role, COUNT_DISTINCT(Survey__c) cnt
        FROM Response_PROJ__c
        WHERE User_Login__r.Role__c != null
        GROUP BY User_Login__r.Role__c
    ];

    for (AggregateResult r : grouped) {
        result.add(new RoleResponseCount(
            (String)r.get('role'),
            (Integer)r.get('cnt')
        ));
    }

    return result;
}


public class RoleResponseCount {
    @AuraEnabled public String role;
    @AuraEnabled public Integer count;

    public RoleResponseCount(String role, Integer count) {
        this.role = role;
        this.count = count;
    }
}


@AuraEnabled(cacheable=true)
public static List<SurveyAverageRating> getTopRatedSurveysByMonth(Integer month, Integer year) {
    Date start = Date.newInstance(year, month, 1);
    Date endDate = start.addMonths(1).addDays(-1);

    AggregateResult[] results = [
        SELECT Survey_PROJ__r.Title_c__c title, AVG(Rating__c) avgRating
        FROM SurveyRating_PROJ__c
        WHERE Survey_PROJ__r.End_Date__c >= :start
          AND Survey_PROJ__r.End_Date__c <= :endDate
        GROUP BY Survey_PROJ__r.Title_c__c
        ORDER BY AVG(Rating__c) DESC
        LIMIT 3
    ];

    List<SurveyAverageRating> topSurveys = new List<SurveyAverageRating>();
    for (AggregateResult r : results) {
        String t = (String) r.get('title');
        Decimal avg = (Decimal) r.get('avgRating');
        if (t != null && avg != null) {
            topSurveys.add(new SurveyAverageRating(t, avg));
        }
    }

    return topSurveys;
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
                SELECT Id, Title_c__c, Description__c, End_Date__c
                FROM Survey_PROJ__c
                ORDER BY Title_c__c ASC
            ];
        }


        


    @AuraEnabled(cacheable=true)
public static List<Survey_PROJ__c> getSurveysForUser(Id userLoginId) {
    List<User_Category_PROJ__c> userCategories = [
        SELECT Category_PROJ__c
        FROM User_Category_PROJ__c
        WHERE User__c = :userLoginId
    ];

    if (userCategories.isEmpty()) {
        return new List<Survey_PROJ__c>();
    }

    Set<Id> categoryIds = new Set<Id>();
    for (User_Category_PROJ__c uc : userCategories) {
        categoryIds.add(uc.Category_PROJ__c);
    }

    return [
        SELECT Id, Title_c__c, End_Date__c, Category_PROJ__r.Name
        FROM Survey_PROJ__c
        WHERE Category_PROJ__c IN :categoryIds
          AND End_Date__c >= TODAY
        ORDER BY End_Date__c ASC
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
public static List<Map<String, Integer>> getControlQuestionStats(Id surveyId) {
    Map<Id, String> correctAnswers = new Map<Id, String>();

    for (Question_PROJ__c q : [
        SELECT Id, Correct_Choice__c, Is_Control_c__c
        FROM Question_PROJ__c
        WHERE Survey__c = :surveyId
        AND Is_Control_c__c = true
    ]) {
        correctAnswers.put(q.Id, q.Correct_Choice__c);
    }

    if (correctAnswers.isEmpty()) {
        return new List<Map<String, Integer>> {
            new Map<String, Integer>{ 'correctCount' => 0, 'incorrectCount' => 0 }
        };
    }

    List<AggregateResult> results = [
        SELECT Question_PROJ__c, Selected_Choice__c, COUNT(Id) cnt
        FROM Response_PROJ__c
        WHERE Question_PROJ__c IN :correctAnswers.keySet()
        GROUP BY Question_PROJ__c, Selected_Choice__c
    ];

    Integer correct = 0;
    Integer incorrect = 0;

    for (AggregateResult ar : results) {
        Id qid = (Id)ar.get('Question_PROJ__c');
        String selected = (String)ar.get('Selected_Choice__c');
        Integer cnt = (Integer)ar.get('cnt');

        if (selected == correctAnswers.get(qid)) {
            correct += cnt;
        } else {
            incorrect += cnt;
        }
    }

    return new List<Map<String, Integer>> {
        new Map<String, Integer>{
            'correctCount' => correct,
            'incorrectCount' => incorrect
        }
    };
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



public class DepartmentSurveyCompletion {
    @AuraEnabled public String departmentName;
    @AuraEnabled public Integer completedUsers;
    @AuraEnabled public Integer notCompletedUsers;

    public DepartmentSurveyCompletion(String departmentName,
                                      Integer completedUsers,
                                      Integer notCompletedUsers) {
        this.departmentName    = departmentName;
        this.completedUsers    = completedUsers;
        this.notCompletedUsers = notCompletedUsers;
    }
}

@AuraEnabled(cacheable=true)
public static List<DepartmentSurveyCompletion> getSurveyCompletionByDepartment(Id surveyId) {
    Survey_PROJ__c survey = [
        SELECT Category_PROJ__c
        FROM Survey_PROJ__c
        WHERE Id = :surveyId
        LIMIT 1
    ];

    List<User_Category_PROJ__c> allUsers = [
        SELECT User__c
        FROM User_Category_PROJ__c
        WHERE Category_PROJ__c = :survey.Category_PROJ__c
    ];
    Set<Id> allUserIds = new Set<Id>();
    for (User_Category_PROJ__c uc : allUsers) {
        allUserIds.add(uc.User__c);
    }


    AggregateResult[] completedAgg = [
        SELECT COUNT_DISTINCT(User_Login__c) userCount
        FROM Response_PROJ__c
        WHERE Question_PROJ__r.Survey__c = :surveyId
          AND User_Login__c IN :allUserIds
    ];
    Integer completedUsers = completedAgg.isEmpty()
        ? 0 
        : (Integer) completedAgg[0].get('userCount');
    Integer notCompletedUsers = allUserIds.size() - completedUsers;

    String departmentName = [
        SELECT Name
        FROM Category_PROJ__c
        WHERE Id = :survey.Category_PROJ__c
    ].Name;

    return new List<DepartmentSurveyCompletion>{
        new DepartmentSurveyCompletion(departmentName, completedUsers, notCompletedUsers)
    };
}


@AuraEnabled(cacheable=true)
public static List<Question_PROJ__c> getControlQuestions(Id surveyId) {
    return [
        SELECT Id,
               Question_Text__c,
               Correct_Choice__c
        FROM Question_PROJ__c
        WHERE Survey__c        = :surveyId
          AND Is_Control_c__c = true   
          ORDER BY Name   
    ];
}



}
