using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Habits.Dtos;
using LifeTracker.Domain.Habits;

namespace LifeTracker.Application.Habits.Services;

public class HabitService : IHabitService
{
    private readonly ILifeTrackerDbContext _dbContext;
    private readonly IStreakCalculator _streakCalculator;
    private readonly IHabitTimelineProjector _projector;
    private readonly ILogger<HabitService> _logger;

    public HabitService(
        ILifeTrackerDbContext dbContext,
        IStreakCalculator streakCalculator,
        IHabitTimelineProjector projector,
        ILogger<HabitService> logger)
    {
        _dbContext = dbContext;
        _streakCalculator = streakCalculator;
        _projector = projector;
        _logger = logger;
    }

    public async Task<List<HabitDto>> GetHabitsAsync(
        Guid userId,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = _dbContext.HabitDefinitions
            .Include(h => h.Logs)
            .Where(h => h.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(h => !h.IsArchived);
        }

        var habits = await query
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(cancellationToken);

        return habits.Select(h =>
        {
            var streak = _streakCalculator.Calculate(h, h.Logs.ToList(), today);
            return MapToDto(h, streak);
        }).ToList();
    }

    public async Task<HabitDto> CreateHabitAsync(
        Guid userId,
        CreateHabitRequest request,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        var frequency = ParseFrequency(request.FrequencyType, request.TargetDaysPerWeek, request.SpecificDays);

        var habit = new HabitDefinition(
            userId,
            request.Name,
            request.Description,
            request.Category,
            frequency,
            request.Color,
            request.Icon
        );

        _dbContext.HabitDefinitions.Add(habit);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Hábito {Name} creado exitosamente con ID {HabitId} para usuario {UserId}", habit.Name, habit.Id, userId);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return MapToDto(habit, new StreakResult(0, 0, false));
    }

    public async Task<HabitDto?> UpdateHabitAsync(
        Guid userId,
        Guid habitId,
        UpdateHabitRequest request,
        CancellationToken cancellationToken = default)
    {
        var habit = await _dbContext.HabitDefinitions
            .Include(h => h.Logs)
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId, cancellationToken);

        if (habit == null) return null;

        var frequency = ParseFrequency(request.FrequencyType, request.TargetDaysPerWeek, request.SpecificDays);
        habit.UpdateDetails(
            request.Name,
            request.Description,
            request.Category,
            frequency,
            request.Color,
            request.Icon
        );

        await _dbContext.SaveChangesAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var streak = _streakCalculator.Calculate(habit, habit.Logs.ToList(), today);
        return MapToDto(habit, streak);
    }

    public async Task<bool> ArchiveHabitAsync(
        Guid userId,
        Guid habitId,
        CancellationToken cancellationToken = default)
    {
        var habit = await _dbContext.HabitDefinitions
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId, cancellationToken);

        if (habit == null) return false;

        habit.Archive();
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ToggleHabitResultDto> ToggleHabitCompletionAsync(
        Guid userId,
        Guid habitId,
        ToggleHabitRequest request,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var targetDate = request.Date ?? today;

        // Invariante 4: Comprobación estricta de la ventana de gracia de 48 horas
        if (targetDate < today.AddDays(-2))
        {
            throw new InvalidOperationException("El período de gracia para registrar hábitos es de un máximo de 48 horas.");
        }

        var habit = await _dbContext.HabitDefinitions
            .Include(h => h.Logs)
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId, cancellationToken);

        if (habit == null)
        {
            throw new KeyNotFoundException("Hábito no encontrado.");
        }

        var existingLog = habit.Logs.FirstOrDefault(l => l.Date == targetDate);
        string newStatus;

        if (existingLog != null && existingLog.Status == HabitLogStatus.Completed)
        {
            // Toggle inverso: Desmarcar hábito
            _dbContext.HabitLogs.Remove(existingLog);
            await _projector.RemoveHabitProjectionAsync(userId, existingLog.Id, cancellationToken);
            newStatus = "pending";
        }
        else
        {
            // Marcar como completado
            if (existingLog != null)
            {
                existingLog.UpdateStatus(HabitLogStatus.Completed, request.Notes);
            }
            else
            {
                existingLog = new HabitLog(habitId, userId, targetDate, HabitLogStatus.Completed, request.Notes);
                _dbContext.HabitLogs.Add(existingLog);
            }

            newStatus = "completed";
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        // Recalcular racha actualizada
        var allLogs = await _dbContext.HabitLogs
            .Where(l => l.HabitId == habitId)
            .ToListAsync(cancellationToken);

        var streak = _streakCalculator.Calculate(habit, allLogs, today);

        // Si fue completado, proyectar al Spine transversal
        if (newStatus == "completed" && existingLog != null)
        {
            await _projector.ProjectHabitCompletedAsync(userId, habit, existingLog, streak.CurrentStreak, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new ToggleHabitResultDto(
            habit.Id,
            targetDate,
            newStatus,
            streak.CurrentStreak,
            streak.LongestStreak
        );
    }

    private static HabitFrequency ParseFrequency(string type, int? targetDays, List<int>? specificDays)
    {
        return type?.ToLowerInvariant() switch
        {
            "specific_days" => HabitFrequency.Specific((specificDays ?? []).Select(d => (DayOfWeek)d).ToArray()),
            "times_per_week" => HabitFrequency.TimesPerWeek(targetDays ?? 3),
            _ => HabitFrequency.Daily()
        };
    }

    private static HabitDto MapToDto(HabitDefinition habit, StreakResult streak)
    {
        return new HabitDto(
            habit.Id,
            habit.UserId,
            habit.Name,
            habit.Description,
            habit.Category,
            new HabitFrequencyDto(
                habit.Frequency.Type.ToString().ToLowerInvariant(),
                habit.Frequency.TargetDaysPerWeek,
                habit.Frequency.SpecificDays?.Select(d => (int)d).ToList()
            ),
            habit.Color,
            habit.Icon,
            habit.IsArchived,
            streak.CurrentStreak,
            streak.LongestStreak,
            streak.IsCompletedToday,
            habit.CreatedAt
        );
    }
}
