public class SurveyReminderScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        SurveyReminderBatch batch = new SurveyReminderBatch();
        Database.executeBatch(batch, 200);
    }
}
