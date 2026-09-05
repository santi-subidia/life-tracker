using LifeTracker.Domain.Habits;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class StreakCalculatorTests
{
    private readonly StreakCalculator _calculator = new();

    [Fact]
    public void DailyHabit_WithFiveConsecutiveDays_ShouldReturnStreakOfFive()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var habit = new HabitDefinition(userId, "Tomar Agua", frequency: HabitFrequency.Daily());
        var today = new DateOnly(2026, 9, 5);

        var logs = new List<HabitLog>
        {
            new(habit.Id, userId, today, HabitLogStatus.Completed),
            new(habit.Id, userId, today.AddDays(-1), HabitLogStatus.Completed),
            new(habit.Id, userId, today.AddDays(-2), HabitLogStatus.Completed),
            new(habit.Id, userId, today.AddDays(-3), HabitLogStatus.Completed),
            new(habit.Id, userId, today.AddDays(-4), HabitLogStatus.Completed),
        };

        // Act
        var result = _calculator.Calculate(habit, logs, today);

        // Assert
        Assert.True(result.IsCompletedToday);
        Assert.Equal(5, result.CurrentStreak);
        Assert.Equal(5, result.LongestStreak);
    }

    [Fact]
    public void DailyHabit_TodayNotCompleted_ShouldCountFromYesterday()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var habit = new HabitDefinition(userId, "Lectura", frequency: HabitFrequency.Daily());
        var today = new DateOnly(2026, 9, 5);

        // Ayer y anteayer completados, hoy aún no
        var logs = new List<HabitLog>
        {
            new(habit.Id, userId, today.AddDays(-1), HabitLogStatus.Completed),
            new(habit.Id, userId, today.AddDays(-2), HabitLogStatus.Completed),
        };

        // Act
        var result = _calculator.Calculate(habit, logs, today);

        // Assert
        Assert.False(result.IsCompletedToday);
        Assert.Equal(2, result.CurrentStreak);
    }

    [Fact]
    public void DailyHabit_WithSkippedDay_ShouldNotBreakStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var habit = new HabitDefinition(userId, "Gimnasio", frequency: HabitFrequency.Daily());
        var today = new DateOnly(2026, 9, 5);

        // Hoy completado, ayer salteado con justificación (Skipped), anteayer completado
        var logs = new List<HabitLog>
        {
            new(habit.Id, userId, today, HabitLogStatus.Completed),
            new(habit.Id, userId, today.AddDays(-1), HabitLogStatus.Skipped),
            new(habit.Id, userId, today.AddDays(-2), HabitLogStatus.Completed),
        };

        // Act
        var result = _calculator.Calculate(habit, logs, today);

        // Assert
        Assert.True(result.IsCompletedToday);
        // Skipped no suma pero mantiene continuidad: 2 completados
        Assert.Equal(2, result.CurrentStreak);
    }

    [Fact]
    public void SpecificDaysHabit_MonWedFri_NonScheduledDaysShouldNotBreakStreak()
    {
        // Arrange
        var userId = Guid.NewGuid();
        // Lunes, Miércoles, Viernes
        var habit = new HabitDefinition(
            userId,
            "Fuerza",
            frequency: HabitFrequency.Specific(DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday)
        );

        // 2026-09-04 es Viernes, 2026-09-02 es Miércoles, 2026-08-31 es Lunes
        var friday = new DateOnly(2026, 9, 4);
        var wednesday = new DateOnly(2026, 9, 2);
        var monday = new DateOnly(2026, 8, 31);

        var logs = new List<HabitLog>
        {
            new(habit.Id, userId, friday, HabitLogStatus.Completed),
            new(habit.Id, userId, wednesday, HabitLogStatus.Completed),
            new(habit.Id, userId, monday, HabitLogStatus.Completed),
        };

        // Act: evaluamos el Sábado 2026-09-05 (día no programado)
        var saturday = new DateOnly(2026, 9, 5);
        var result = _calculator.Calculate(habit, logs, saturday);

        // Assert
        Assert.False(result.IsCompletedToday); // El sábado no tocaba ni está completado
        Assert.Equal(3, result.CurrentStreak); // Los 3 días programados anteriores fueron completados
    }

    [Fact]
    public void HabitFrequency_SpecificDays_InvalidInput_ShouldThrowArgumentException()
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentException>(() => HabitFrequency.Specific());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8)]
    public void HabitFrequency_TimesPerWeek_OutOfRange_ShouldThrowArgumentOutOfRangeException(int target)
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentOutOfRangeException>(() => HabitFrequency.TimesPerWeek(target));
    }
}
