using LifeTracker.Application.Fitness.Dtos;

namespace LifeTracker.Application.Fitness.Services;

public interface IFitnessService
{
    // Ejercicios
    Task<IReadOnlyList<ExerciseDto>> GetExercisesAsync(
        Guid userId,
        string? search = null,
        string? muscle = null,
        string? discipline = null,
        string? equipment = null,
        CancellationToken ct = default);

    Task<ExerciseDto?> GetExerciseByIdAsync(Guid userId, Guid exerciseId, CancellationToken ct = default);
    Task<ExerciseDto> CreateCustomExerciseAsync(Guid userId, CreateCustomExerciseRequest req, CancellationToken ct = default);
    Task<ExerciseDto> UpdateCustomExerciseAsync(Guid userId, Guid exerciseId, UpdateCustomExerciseRequest req, CancellationToken ct = default);
    Task DeleteCustomExerciseAsync(Guid userId, Guid exerciseId, CancellationToken ct = default);

    // Rutinas
    Task<IReadOnlyList<RoutineDto>> GetRoutinesAsync(Guid userId, CancellationToken ct = default);
    Task<RoutineDto?> GetRoutineByIdAsync(Guid userId, Guid routineId, CancellationToken ct = default);
    Task<RoutineDto> CreateRoutineAsync(Guid userId, CreateRoutineRequest req, CancellationToken ct = default);
    Task<RoutineDto> UpdateRoutineAsync(Guid userId, Guid routineId, UpdateRoutineRequest req, CancellationToken ct = default);
    Task ArchiveRoutineAsync(Guid userId, Guid routineId, CancellationToken ct = default);

    // Sesiones de Entrenamiento
    Task<WorkoutSessionDto?> GetActiveSessionAsync(Guid userId, CancellationToken ct = default);
    Task<WorkoutSessionDto> StartWorkoutSessionAsync(Guid userId, StartWorkoutSessionRequest req, CancellationToken ct = default);
    Task<WorkoutSetDto> LogWorkoutSetAsync(Guid userId, Guid sessionId, LogWorkoutSetRequest req, CancellationToken ct = default);
    Task<WorkoutSetDto> UpdateWorkoutSetAsync(Guid userId, Guid sessionId, Guid setId, UpdateWorkoutSetRequest req, CancellationToken ct = default);
    Task DeleteWorkoutSetAsync(Guid userId, Guid sessionId, Guid setId, CancellationToken ct = default);
    Task<WorkoutSessionDto> CompleteWorkoutSessionAsync(Guid userId, Guid sessionId, CompleteWorkoutSessionRequest req, CancellationToken ct = default);
    Task DiscardWorkoutSessionAsync(Guid userId, Guid sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<WorkoutSessionDto>> GetWorkoutSessionsHistoryAsync(Guid userId, int limit = 20, CancellationToken ct = default);
    Task<WorkoutSessionDto?> GetWorkoutSessionByIdAsync(Guid userId, Guid sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<WorkoutSetDto>> GetExerciseHistoryAsync(Guid userId, string exerciseNameOrId, int limit = 10, CancellationToken ct = default);
}
