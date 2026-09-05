using LifeTracker.Application.Habits.Dtos;

namespace LifeTracker.Application.Habits.Services;

public interface IHabitService
{
    Task<List<HabitDto>> GetHabitsAsync(
        Guid userId,
        bool includeArchived = false,
        CancellationToken cancellationToken = default);

    Task<HabitDto> CreateHabitAsync(
        Guid userId,
        CreateHabitRequest request,
        CancellationToken cancellationToken = default);

    Task<HabitDto?> UpdateHabitAsync(
        Guid userId,
        Guid habitId,
        UpdateHabitRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> ArchiveHabitAsync(
        Guid userId,
        Guid habitId,
        CancellationToken cancellationToken = default);

    Task<ToggleHabitResultDto> ToggleHabitCompletionAsync(
        Guid userId,
        Guid habitId,
        ToggleHabitRequest request,
        CancellationToken cancellationToken = default);
}
