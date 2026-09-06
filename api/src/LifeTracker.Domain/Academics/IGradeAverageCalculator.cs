namespace LifeTracker.Domain.Academics;

public record SubjectGradeSummary(Guid SubjectId, SubjectStatus Status, decimal? FinalOrAverageGrade);

public interface IGradeAverageCalculator
{
    decimal? CalculateSubjectAverage(IEnumerable<AcademicMilestone> milestones);
    decimal? CalculateCareerAverage(IEnumerable<SubjectGradeSummary> subjects);
}
