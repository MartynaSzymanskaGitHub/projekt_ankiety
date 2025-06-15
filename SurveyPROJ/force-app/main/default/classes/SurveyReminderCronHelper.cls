public class SurveyReminderCronHelper {
    public static void scheduleTwiceDaily() {
        for (CronTrigger c : [SELECT Id, CronJobDetail.Name FROM CronTrigger WHERE CronJobDetail.Name LIKE 'SurveyReminder_%']) {
            System.abortJob(c.Id);
        }

        String morning = '0 0 10 * * ?';
        System.schedule('SurveyReminder_10', morning, new SurveyReminderScheduler());

        String evening = '0 0 16 * * ?';
        System.schedule('SurveyReminder_16', evening, new SurveyReminderScheduler());
    }
}
