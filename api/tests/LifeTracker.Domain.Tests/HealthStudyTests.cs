using LifeTracker.Domain.Health;
using LifeTracker.Domain.Timeline;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class HealthStudyTests
{
    [Fact]
    public void CreateHealthStudy_WithValidData_ShouldInstantiateProperly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var studyDate = new DateOnly(2026, 3, 15);

        // Act
        var study = new HealthStudy(
            userId,
            "Análisis de Sangre",
            studyDate,
            "https://r2.example.com/studies/test.pdf",
            "Laboratorio Central",
            "Perfil lipídico normal"
        );

        var clinicalValue = study.AddClinicalValue("Glucemia", "92", "mg/dL", "Química Clínica", false);

        // Assert
        Assert.NotEqual(Guid.Empty, study.Id);
        Assert.Equal(userId, study.UserId);
        Assert.Equal("Análisis de Sangre", study.StudyType);
        Assert.Single(study.ClinicalValues);
        Assert.Equal("Glucemia", clinicalValue.MetricName);
        Assert.Equal("92", clinicalValue.Value);
    }

    [Fact]
    public void CreateHealthStudy_WithEmptyUserId_ShouldThrowArgumentException()
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentException>(() =>
            new HealthStudy(
                Guid.Empty,
                "Orina Completa",
                new DateOnly(2026, 1, 1),
                "http://test.url"
            )
        );
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void CreateDailyLog_WithInvalidMoodScore_ShouldThrowArgumentOutOfRangeException(short invalidScore)
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new DailyLog(Guid.NewGuid(), new DateOnly(2026, 5, 10), moodScore: invalidScore)
        );
    }

    [Fact]
    public void TimelineItem_TogglePin_ShouldInvertPinnedState()
    {
        // Arrange
        var item = new TimelineItem(
            Guid.NewGuid(),
            new DateOnly(2026, 9, 5),
            "health",
            Guid.NewGuid(),
            "study_saved",
            "Nuevo estudio",
            pinned: false
        );

        // Act
        item.TogglePin();

        // Assert
        Assert.True(item.Pinned);

        // Act again
        item.TogglePin();
        Assert.False(item.Pinned);
    }
}
