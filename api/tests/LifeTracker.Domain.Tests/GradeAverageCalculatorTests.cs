using LifeTracker.Domain.Academics;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class GradeAverageCalculatorTests
{
    private readonly GradeAverageCalculator _calculator = new();

    [Fact]
    public void SubjectWithoutMilestones_ShouldReturnNull()
    {
        var result = _calculator.CalculateSubjectAverage([]);
        Assert.Null(result);
    }

    [Fact]
    public void SubjectWithMilestonesWithoutGrades_ShouldReturnNull()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var milestones = new List<AcademicMilestone>
        {
            new(userId, subjectId, "Parcial 1", MilestoneType.Parcial, new DateOnly(2026, 9, 10), 50m),
            new(userId, subjectId, "Parcial 2", MilestoneType.Parcial, new DateOnly(2026, 11, 10), 50m)
        };

        var result = _calculator.CalculateSubjectAverage(milestones);
        Assert.Null(result);
    }

    [Fact]
    public void SubjectWithUnweightedMilestones_ShouldReturnArithmeticAverage()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var m1 = new AcademicMilestone(userId, subjectId, "Parcial 1", MilestoneType.Parcial, new DateOnly(2026, 9, 10));
        m1.AssignGrade(7.0m);
        var m2 = new AcademicMilestone(userId, subjectId, "Parcial 2", MilestoneType.Parcial, new DateOnly(2026, 11, 10));
        m2.AssignGrade(9.0m);

        var result = _calculator.CalculateSubjectAverage([m1, m2]);
        Assert.Equal(8.00m, result);
    }

    [Fact]
    public void SubjectWithFullyWeightedMilestones_ShouldReturnWeightedAverage()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var m1 = new AcademicMilestone(userId, subjectId, "Primer Parcial", MilestoneType.Parcial, new DateOnly(2026, 9, 10), 40m);
        m1.AssignGrade(8.0m);
        var m2 = new AcademicMilestone(userId, subjectId, "Segundo Parcial", MilestoneType.Parcial, new DateOnly(2026, 11, 10), 60m);
        m2.AssignGrade(10.0m);

        // (8.00 * 40 + 10.00 * 60) / 100 = (320 + 600) / 100 = 9.20
        var result = _calculator.CalculateSubjectAverage([m1, m2]);
        Assert.Equal(9.20m, result);
    }

    [Fact]
    public void SubjectWithPartialWeights_ShouldNormalizeToCompletedWeight()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var m1 = new AcademicMilestone(userId, subjectId, "Primer Parcial", MilestoneType.Parcial, new DateOnly(2026, 9, 10), 40m);
        m1.AssignGrade(8.0m);
        var m2 = new AcademicMilestone(userId, subjectId, "Segundo Parcial", MilestoneType.Parcial, new DateOnly(2026, 11, 10), 60m);
        // m2 aún no calificado

        // (8.00 * 40) / 40 = 8.00
        var result = _calculator.CalculateSubjectAverage([m1, m2]);
        Assert.Equal(8.00m, result);
    }

    [Fact]
    public void SubjectWithRecuperatorioReplacingParcial_ShouldUseRecuperatorioGrade()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var m1 = new AcademicMilestone(userId, subjectId, "Primer Parcial", MilestoneType.Parcial, new DateOnly(2026, 9, 10), 50m);
        m1.AssignGrade(2.0m); // Reprobado

        var m1Recup = new AcademicMilestone(
            userId,
            subjectId,
            "Recuperatorio Primer Parcial",
            MilestoneType.Recuperatorio,
            new DateOnly(2026, 9, 20),
            replacesMilestoneId: m1.Id
        );
        m1Recup.AssignGrade(8.0m); // Aprobado con 8

        var m2 = new AcademicMilestone(userId, subjectId, "Segundo Parcial", MilestoneType.Parcial, new DateOnly(2026, 11, 10), 50m);
        m2.AssignGrade(6.0m);

        // m1 reemplazado por m1Recup (hereda peso 50%). (8.0 * 50 + 6.0 * 50) / 100 = 7.00
        var result = _calculator.CalculateSubjectAverage([m1, m1Recup, m2]);
        Assert.Equal(7.00m, result);
    }

    [Fact]
    public void SubjectWithMixedWeights_ShouldDistributeRemainingWeightEqually()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var m1 = new AcademicMilestone(userId, subjectId, "Hito 1", MilestoneType.Parcial, new DateOnly(2026, 9, 10), 50m);
        m1.AssignGrade(8.0m);
        var m2 = new AcademicMilestone(userId, subjectId, "Hito 2", MilestoneType.Entrega, new DateOnly(2026, 10, 10)); // Sin peso -> toma el 50% remanente
        m2.AssignGrade(6.0m);

        // (8.0 * 50 + 6.0 * 50) / 100 = 7.00
        var result = _calculator.CalculateSubjectAverage([m1, m2]);
        Assert.Equal(7.00m, result);
    }

    [Fact]
    public void GradeRounding_ShouldRoundToTwoDecimalsWithMidpointAwayFromZero()
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var m1 = new AcademicMilestone(userId, subjectId, "Hito 1", MilestoneType.Parcial, new DateOnly(2026, 9, 10));
        m1.AssignGrade(7.0m);
        var m2 = new AcademicMilestone(userId, subjectId, "Hito 2", MilestoneType.Parcial, new DateOnly(2026, 10, 10));
        m2.AssignGrade(8.0m);
        var m3 = new AcademicMilestone(userId, subjectId, "Hito 3", MilestoneType.Parcial, new DateOnly(2026, 11, 10));
        m3.AssignGrade(8.0m);

        // (7 + 8 + 8) / 3 = 23 / 3 = 7.6666... -> 7.67
        var result = _calculator.CalculateSubjectAverage([m1, m2, m3]);
        Assert.Equal(7.67m, result);
    }

    [Fact]
    public void CareerAverage_ShouldOnlyIncludeApprovedSubjectsWithGrades()
    {
        var subjects = new List<SubjectGradeSummary>
        {
            new(Guid.NewGuid(), SubjectStatus.Aprobada, 8.50m),
            new(Guid.NewGuid(), SubjectStatus.Aprobada, 9.50m),
            new(Guid.NewGuid(), SubjectStatus.EnCurso, 10.00m), // No debe contar
            new(Guid.NewGuid(), SubjectStatus.Regularizada, 7.00m), // No debe contar
            new(Guid.NewGuid(), SubjectStatus.Recursar, 2.00m), // No debe contar
            new(Guid.NewGuid(), SubjectStatus.Aprobada, null) // Sin nota, no debe contar
        };

        // (8.50 + 9.50) / 2 = 9.00
        var result = _calculator.CalculateCareerAverage(subjects);
        Assert.Equal(9.00m, result);
    }

    [Fact]
    public void CareerAverage_WithoutApprovedSubjects_ShouldReturnNull()
    {
        var subjects = new List<SubjectGradeSummary>
        {
            new(Guid.NewGuid(), SubjectStatus.EnCurso, 8.00m),
            new(Guid.NewGuid(), SubjectStatus.Recursar, 2.00m)
        };

        var result = _calculator.CalculateCareerAverage(subjects);
        Assert.Null(result);
    }
}
