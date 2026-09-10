using Microsoft.EntityFrameworkCore;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Application.Fitness.Dtos;
using LifeTracker.Domain.Fitness;

namespace LifeTracker.Application.Fitness.Services;

public class FitnessService : IFitnessService
{
    private readonly ILifeTrackerDbContext _context;
    private readonly IProgressiveOverloadCalculator _overloadCalculator;
    private readonly IMuscleVolumeAggregator _volumeAggregator;
    private readonly IFitnessTimelineProjector _timelineProjector;

    public FitnessService(
        ILifeTrackerDbContext context,
        IProgressiveOverloadCalculator overloadCalculator,
        IMuscleVolumeAggregator volumeAggregator,
        IFitnessTimelineProjector timelineProjector)
    {
        _context = context;
        _overloadCalculator = overloadCalculator;
        _volumeAggregator = volumeAggregator;
        _timelineProjector = timelineProjector;
    }

    #region Ejercicios

    public async Task<IReadOnlyList<ExerciseDto>> GetExercisesAsync(
        Guid userId,
        string? search = null,
        string? muscle = null,
        string? discipline = null,
        string? equipment = null,
        CancellationToken ct = default)
    {
        var query = _context.Exercises
            .AsNoTracking()
            .Where(e => e.UserId == null || e.UserId == userId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(e => e.Name.ToLower().Contains(term) || e.Slug.Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(muscle))
        {
            var m = muscle.Trim().ToLowerInvariant();
            query = query.Where(e => e.PrimaryMuscleGroup.ToString().ToLower() == m ||
                                     e.MuscleStimulus.Any(s => s.Muscle == m));
        }

        if (!string.IsNullOrWhiteSpace(discipline) && Enum.TryParse<FitnessDiscipline>(discipline, true, out var discEnum))
        {
            query = query.Where(e => e.Discipline == discEnum);
        }

        if (!string.IsNullOrWhiteSpace(equipment) && Enum.TryParse<EquipmentType>(equipment, true, out var eqEnum))
        {
            query = query.Where(e => e.Equipment == eqEnum);
        }

        var exercises = await query.OrderBy(e => e.Name).ToListAsync(ct);
        return exercises.Select(MapToExerciseDto).ToList();
    }

    public async Task<ExerciseDto?> GetExerciseByIdAsync(Guid userId, Guid exerciseId, CancellationToken ct = default)
    {
        var exercise = await _context.Exercises
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == exerciseId && (e.UserId == null || e.UserId == userId), ct);

        return exercise == null ? null : MapToExerciseDto(exercise);
    }

    public async Task<ExerciseDto> CreateCustomExerciseAsync(Guid userId, CreateCustomExerciseRequest req, CancellationToken ct = default)
    {
        var discipline = Enum.Parse<FitnessDiscipline>(req.Discipline, true);
        var primaryMuscle = Enum.Parse<MuscleGroup>(req.PrimaryMuscleGroup, true);
        var equipment = Enum.Parse<EquipmentType>(req.Equipment, true);
        var stimuli = req.MuscleStimulus.Select(s => new MuscleStimulus(s.Muscle, s.StimulusPct)).ToList();

        var slug = GenerateSlug(req.Name) + "-" + Guid.NewGuid().ToString("N")[..6];

        var exercise = new Exercise(
            userId: userId,
            name: req.Name,
            slug: slug,
            discipline: discipline,
            primaryMuscleGroup: primaryMuscle,
            stimulusList: stimuli,
            equipment: equipment,
            instructions: req.Instructions,
            gifUrl: req.GifUrl,
            videoUrl: req.VideoUrl,
            isCustom: true
        );

        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync(ct);

        return MapToExerciseDto(exercise);
    }

    public async Task<ExerciseDto> UpdateCustomExerciseAsync(Guid userId, Guid exerciseId, UpdateCustomExerciseRequest req, CancellationToken ct = default)
    {
        var exercise = await _context.Exercises
            .FirstOrDefaultAsync(e => e.Id == exerciseId && e.UserId == userId, ct);

        if (exercise == null)
            throw new KeyNotFoundException("Ejercicio no encontrado o no pertenece al usuario.");

        var discipline = Enum.Parse<FitnessDiscipline>(req.Discipline, true);
        var primaryMuscle = Enum.Parse<MuscleGroup>(req.PrimaryMuscleGroup, true);
        var equipment = Enum.Parse<EquipmentType>(req.Equipment, true);
        var stimuli = req.MuscleStimulus.Select(s => new MuscleStimulus(s.Muscle, s.StimulusPct)).ToList();

        exercise.Update(
            name: req.Name,
            discipline: discipline,
            primaryMuscleGroup: primaryMuscle,
            stimulusList: stimuli,
            equipment: equipment,
            instructions: req.Instructions,
            gifUrl: req.GifUrl,
            videoUrl: req.VideoUrl
        );

        await _context.SaveChangesAsync(ct);
        return MapToExerciseDto(exercise);
    }

    public async Task DeleteCustomExerciseAsync(Guid userId, Guid exerciseId, CancellationToken ct = default)
    {
        var exercise = await _context.Exercises
            .FirstOrDefaultAsync(e => e.Id == exerciseId && e.UserId == userId, ct);

        if (exercise == null)
            throw new KeyNotFoundException("Ejercicio no encontrado o no pertenece al usuario.");

        // Invariante 11: si está en sesiones pasadas o rutinas, rechazar borrado
        var inRoutines = await _context.RoutineExercises.AnyAsync(re => re.ExerciseId == exerciseId, ct);
        var inSets = await _context.WorkoutSets.AnyAsync(s => s.ExerciseId == exerciseId, ct);

        if (inRoutines || inSets)
            throw new InvalidOperationException("Invariante 11: No se puede eliminar un ejercicio utilizado en rutinas o entrenamientos históricos.");

        _context.Exercises.Remove(exercise);
        await _context.SaveChangesAsync(ct);
    }

    #endregion

    #region Rutinas

    public async Task<IReadOnlyList<RoutineDto>> GetRoutinesAsync(Guid userId, CancellationToken ct = default)
    {
        var routines = await _context.Routines
            .AsNoTracking()
            .Where(r => r.UserId == userId && !r.IsArchived)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

        var exerciseIds = routines.SelectMany(r => r.Exercises.Select(e => e.ExerciseId)).Distinct().ToList();
        var exercises = await _context.Exercises
            .AsNoTracking()
            .Where(e => exerciseIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);

        return routines.Select(r => MapToRoutineDto(r, exercises)).ToList();
    }

    public async Task<RoutineDto?> GetRoutineByIdAsync(Guid userId, Guid routineId, CancellationToken ct = default)
    {
        var routine = await _context.Routines
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == routineId && r.UserId == userId, ct);

        if (routine == null) return null;

        var exerciseIds = routine.Exercises.Select(e => e.ExerciseId).Distinct().ToList();
        var exercises = await _context.Exercises
            .AsNoTracking()
            .Where(e => exerciseIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);

        return MapToRoutineDto(routine, exercises);
    }

    public async Task<RoutineDto> CreateRoutineAsync(Guid userId, CreateRoutineRequest req, CancellationToken ct = default)
    {
        var routine = new Routine(userId, req.Name, req.Description, req.EstimatedDurationMinutes);

        foreach (var item in req.Exercises.OrderBy(e => e.OrderIndex))
        {
            routine.AddExercise(
                exerciseId: item.ExerciseId,
                orderIndex: item.OrderIndex,
                targetSets: item.TargetSets,
                targetRepsMin: item.TargetRepsMin,
                targetRepsMax: item.TargetRepsMax,
                restTimerSeconds: item.RestTimerSeconds,
                notes: item.Notes
            );
        }

        _context.Routines.Add(routine);
        await _context.SaveChangesAsync(ct);

        return (await GetRoutineByIdAsync(userId, routine.Id, ct))!;
    }

    public async Task<RoutineDto> UpdateRoutineAsync(Guid userId, Guid routineId, UpdateRoutineRequest req, CancellationToken ct = default)
    {
        var routine = await _context.Routines
            .FirstOrDefaultAsync(r => r.Id == routineId && r.UserId == userId, ct);

        if (routine == null)
            throw new KeyNotFoundException("Rutina no encontrada.");

        routine.Update(req.Name, req.Description, req.EstimatedDurationMinutes);
        routine.ClearExercises();

        foreach (var item in req.Exercises.OrderBy(e => e.OrderIndex))
        {
            routine.AddExercise(
                exerciseId: item.ExerciseId,
                orderIndex: item.OrderIndex,
                targetSets: item.TargetSets,
                targetRepsMin: item.TargetRepsMin,
                targetRepsMax: item.TargetRepsMax,
                restTimerSeconds: item.RestTimerSeconds,
                notes: item.Notes
            );
        }

        await _context.SaveChangesAsync(ct);
        return (await GetRoutineByIdAsync(userId, routine.Id, ct))!;
    }

    public async Task ArchiveRoutineAsync(Guid userId, Guid routineId, CancellationToken ct = default)
    {
        var routine = await _context.Routines
            .FirstOrDefaultAsync(r => r.Id == routineId && r.UserId == userId, ct);

        if (routine == null)
            throw new KeyNotFoundException("Rutina no encontrada.");

        routine.Archive();
        await _context.SaveChangesAsync(ct);
    }

    #endregion

    #region Sesiones de Entrenamiento

    public async Task<WorkoutSessionDto?> GetActiveSessionAsync(Guid userId, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(ws => ws.UserId == userId && ws.Status == WorkoutStatus.Active, ct);

        if (session == null) return null;

        return await MapToSessionDtoAsync(userId, session, ct);
    }

    public async Task<WorkoutSessionDto> StartWorkoutSessionAsync(Guid userId, StartWorkoutSessionRequest req, CancellationToken ct = default)
    {
        // Invariante 9: Unicidad estricta de sesión activa
        var activeExists = await _context.WorkoutSessions
            .AnyAsync(ws => ws.UserId == userId && ws.Status == WorkoutStatus.Active, ct);

        if (activeExists)
        {
            throw new InvalidOperationException("Invariante 9: Ya tienes una sesión de entrenamiento activa. Finalízala o descártala antes de iniciar una nueva.");
        }

        var session = new WorkoutSession(userId, req.Name, req.RoutineId);

        // Si proviene de rutina, precargar las series objetivo
        if (req.RoutineId.HasValue)
        {
            var routine = await _context.Routines
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == req.RoutineId.Value && r.UserId == userId, ct);

            if (routine != null)
            {
                int globalOrder = 0;
                foreach (var re in routine.Exercises.OrderBy(e => e.OrderIndex))
                {
                    for (int s = 1; s <= re.TargetSets; s++)
                    {
                        session.AddSet(
                            exerciseId: re.ExerciseId,
                            setOrder: s,
                            type: SetType.Normal,
                            weightKg: 0m,
                            reps: re.TargetRepsMin
                        );
                        globalOrder++;
                    }
                }
            }
        }

        _context.WorkoutSessions.Add(session);
        await _context.SaveChangesAsync(ct);

        return (await GetActiveSessionAsync(userId, ct))!;
    }

    public async Task<WorkoutSetDto> LogWorkoutSetAsync(Guid userId, Guid sessionId, LogWorkoutSetRequest req, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .FirstOrDefaultAsync(ws => ws.Id == sessionId && ws.UserId == userId, ct);

        if (session == null)
            throw new KeyNotFoundException("Sesión no encontrada.");

        var setType = req.SetType == "drop_set" ? SetType.DropSet : Enum.Parse<SetType>(req.SetType, true);

        var set = session.AddSet(
            exerciseId: req.ExerciseId,
            setOrder: req.SetOrder,
            type: setType,
            weightKg: req.WeightKg,
            reps: req.Reps,
            rpe: req.Rpe,
            rir: req.Rir
        );

        if (req.IsCompleted)
        {
            set.MarkCompleted(req.WeightKg, req.Reps, req.Rpe, req.Rir);
        }

        await _context.SaveChangesAsync(ct);

        var exercise = await _context.Exercises.AsNoTracking().FirstOrDefaultAsync(e => e.Id == req.ExerciseId, ct);
        return MapToSetDto(set, exercise, null);
    }

    public async Task<WorkoutSetDto> UpdateWorkoutSetAsync(Guid userId, Guid sessionId, Guid setId, UpdateWorkoutSetRequest req, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .FirstOrDefaultAsync(ws => ws.Id == sessionId && ws.UserId == userId, ct);

        if (session == null)
            throw new KeyNotFoundException("Sesión no encontrada.");

        var set = session.Sets.FirstOrDefault(s => s.Id == setId);
        if (set == null)
            throw new KeyNotFoundException("Serie no encontrada.");

        var setType = req.SetType == "drop_set" ? SetType.DropSet : Enum.Parse<SetType>(req.SetType, true);

        if (req.IsCompleted && !set.IsCompleted)
        {
            set.MarkCompleted(req.WeightKg, req.Reps, req.Rpe, req.Rir);
        }
        else if (!req.IsCompleted && set.IsCompleted)
        {
            set.UnmarkCompleted();
            set.UpdateValues(req.WeightKg, req.Reps, setType, req.Rpe, req.Rir);
        }
        else
        {
            set.UpdateValues(req.WeightKg, req.Reps, setType, req.Rpe, req.Rir);
        }

        await _context.SaveChangesAsync(ct);

        var exercise = await _context.Exercises.AsNoTracking().FirstOrDefaultAsync(e => e.Id == set.ExerciseId, ct);
        return MapToSetDto(set, exercise, null);
    }

    public async Task DeleteWorkoutSetAsync(Guid userId, Guid sessionId, Guid setId, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .FirstOrDefaultAsync(ws => ws.Id == sessionId && ws.UserId == userId, ct);

        if (session == null)
            throw new KeyNotFoundException("Sesión no encontrada.");

        var set = session.Sets.FirstOrDefault(s => s.Id == setId);
        if (set == null)
            throw new KeyNotFoundException("Serie no encontrada.");

        _context.WorkoutSets.Remove(set);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<WorkoutSessionDto> CompleteWorkoutSessionAsync(Guid userId, Guid sessionId, CompleteWorkoutSessionRequest req, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .FirstOrDefaultAsync(ws => ws.Id == sessionId && ws.UserId == userId, ct);

        if (session == null)
            throw new KeyNotFoundException("Sesión no encontrada.");

        var exerciseIds = session.Sets.Select(s => s.ExerciseId).Distinct().ToList();
        var exercises = await _context.Exercises
            .AsNoTracking()
            .Where(e => exerciseIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);

        var volumeSummary = _volumeAggregator.AggregateSession(session, exercises);

        session.UpdateNotes(req.Notes);
        session.Complete(DateTime.UtcNow, volumeSummary.TotalVolumeKg, volumeSummary.TotalSetsCompleted);

        await _context.SaveChangesAsync(ct);

        // Seam: Proyectar al Timeline
        await _timelineProjector.ProjectCompletedWorkoutAsync(session, volumeSummary, ct);

        return (await GetWorkoutSessionByIdAsync(userId, session.Id, ct))!;
    }

    public async Task DiscardWorkoutSessionAsync(Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .FirstOrDefaultAsync(ws => ws.Id == sessionId && ws.UserId == userId, ct);

        if (session == null)
            throw new KeyNotFoundException("Sesión no encontrada.");

        session.Discard();
        await _context.SaveChangesAsync(ct);

        await _timelineProjector.RemoveWorkoutProjectionAsync(userId, sessionId, ct);
    }

    public async Task<IReadOnlyList<WorkoutSessionDto>> GetWorkoutSessionsHistoryAsync(Guid userId, int limit = 20, CancellationToken ct = default)
    {
        var sessions = await _context.WorkoutSessions
            .AsNoTracking()
            .Where(ws => ws.UserId == userId && ws.Status == WorkoutStatus.Completed)
            .OrderByDescending(ws => ws.CompletedAt ?? ws.StartedAt)
            .Take(limit)
            .ToListAsync(ct);

        var result = new List<WorkoutSessionDto>();
        foreach (var s in sessions)
        {
            result.Add(await MapToSessionDtoAsync(userId, s, ct));
        }

        return result;
    }

    public async Task<WorkoutSessionDto?> GetWorkoutSessionByIdAsync(Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var session = await _context.WorkoutSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(ws => ws.Id == sessionId && ws.UserId == userId, ct);

        if (session == null) return null;

        return await MapToSessionDtoAsync(userId, session, ct);
    }

    public async Task<IReadOnlyList<WorkoutSetDto>> GetExerciseHistoryAsync(Guid userId, string exerciseNameOrId, int limit = 10, CancellationToken ct = default)
    {
        Exercise? exercise = null;
        if (Guid.TryParse(exerciseNameOrId, out var exerciseId))
        {
            exercise = await _context.Exercises.AsNoTracking().FirstOrDefaultAsync(e => e.Id == exerciseId, ct);
        }
        else
        {
            var term = exerciseNameOrId.Trim().ToLowerInvariant();
            exercise = await _context.Exercises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Name.ToLower() == term || e.Slug == term, ct);
        }

        if (exercise == null) return [];

        var sets = await _context.WorkoutSets
            .AsNoTracking()
            .Include(s => s.Exercise)
            .Where(s => s.ExerciseId == exercise.Id && s.IsCompleted &&
                        _context.WorkoutSessions.Any(ws => ws.Id == s.SessionId && ws.UserId == userId && ws.Status == WorkoutStatus.Completed))
            .OrderByDescending(s => s.CompletedAt ?? s.CreatedAt)
            .Take(limit)
            .ToListAsync(ct);

        return sets.Select(s => MapToSetDto(s, exercise, null)).ToList();
    }

    #endregion

    #region Helper Mappers

    private async Task<WorkoutSessionDto> MapToSessionDtoAsync(Guid userId, WorkoutSession session, CancellationToken ct)
    {
        var exerciseIds = session.Sets.Select(s => s.ExerciseId).Distinct().ToList();
        var exercises = await _context.Exercises
            .AsNoTracking()
            .Where(e => exerciseIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, ct);

        // Cargar sesiones históricas para sobrecarga progresiva si está activa
        var pastSessions = session.Status == WorkoutStatus.Active
            ? await _context.WorkoutSessions
                .AsNoTracking()
                .Where(ws => ws.UserId == userId && ws.Status == WorkoutStatus.Completed && ws.Id != session.Id)
                .OrderByDescending(ws => ws.CompletedAt ?? ws.StartedAt)
                .Take(5)
                .ToListAsync(ct)
            : new List<WorkoutSession>();

        string? routineName = null;
        if (session.RoutineId.HasValue)
        {
            routineName = await _context.Routines
                .AsNoTracking()
                .Where(r => r.Id == session.RoutineId.Value)
                .Select(r => r.Name)
                .FirstOrDefaultAsync(ct);
        }

        var setDtos = new List<WorkoutSetDto>();
        foreach (var s in session.Sets.OrderBy(s => s.ExerciseId).ThenBy(s => s.SetOrder))
        {
            exercises.TryGetValue(s.ExerciseId, out var ex);

            GhostSetReferenceDto? ghost = null;
            if (session.Status == WorkoutStatus.Active && pastSessions.Count > 0)
            {
                var ghosts = _overloadCalculator.ResolveGhostSets(s.ExerciseId, [s], pastSessions);
                ghost = ghosts.FirstOrDefault();
            }

            setDtos.Add(MapToSetDto(s, ex, ghost));
        }

        return new WorkoutSessionDto(
            Id: session.Id,
            UserId: session.UserId,
            RoutineId: session.RoutineId,
            RoutineName: routineName,
            Name: session.Name,
            Status: session.Status.ToString().ToLowerInvariant(),
            StartedAt: session.StartedAt,
            CompletedAt: session.CompletedAt,
            DurationSeconds: session.DurationSeconds,
            TotalVolumeKg: session.TotalVolumeKg,
            TotalSetsCompleted: session.TotalSetsCompleted,
            Notes: session.Notes,
            Sets: setDtos
        );
    }

    private static ExerciseDto MapToExerciseDto(Exercise e) => new(
        Id: e.Id,
        UserId: e.UserId,
        Name: e.Name,
        Slug: e.Slug,
        Discipline: e.Discipline.ToString().ToLowerInvariant(),
        PrimaryMuscleGroup: e.PrimaryMuscleGroup.ToString().ToLowerInvariant(),
        MuscleStimulus: e.MuscleStimulus.Select(s => new MuscleStimulusDto(s.Muscle, s.StimulusPct)).ToList(),
        Equipment: e.Equipment.ToString().ToLowerInvariant(),
        Instructions: e.Instructions,
        GifUrl: e.GifUrl,
        VideoUrl: e.VideoUrl,
        IsCustom: e.IsCustom,
        CreatedAt: e.CreatedAt
    );

    private static RoutineDto MapToRoutineDto(Routine r, IReadOnlyDictionary<Guid, Exercise> exercises) => new(
        Id: r.Id,
        UserId: r.UserId,
        Name: r.Name,
        Description: r.Description,
        EstimatedDurationMinutes: r.EstimatedDurationMinutes,
        IsArchived: r.IsArchived,
        CreatedAt: r.CreatedAt,
        Exercises: r.Exercises.OrderBy(e => e.OrderIndex).Select(re =>
        {
            exercises.TryGetValue(re.ExerciseId, out var ex);
            return new RoutineExerciseDto(
                Id: re.Id,
                RoutineId: re.RoutineId,
                ExerciseId: re.ExerciseId,
                ExerciseName: ex?.Name ?? "Desconocido",
                PrimaryMuscleGroup: ex?.PrimaryMuscleGroup.ToString().ToLowerInvariant() ?? "chest",
                Equipment: ex?.Equipment.ToString().ToLowerInvariant() ?? "barbell",
                GifUrl: ex?.GifUrl ?? "",
                OrderIndex: re.OrderIndex,
                TargetSets: re.TargetSets,
                TargetRepsMin: re.TargetRepsMin,
                TargetRepsMax: re.TargetRepsMax,
                RestTimerSeconds: re.RestTimerSeconds,
                Notes: re.Notes
            );
        }).ToList()
    );

    private static WorkoutSetDto MapToSetDto(WorkoutSet s, Exercise? ex, GhostSetReferenceDto? ghost) => new(
        Id: s.Id,
        SessionId: s.SessionId,
        ExerciseId: s.ExerciseId,
        ExerciseName: ex?.Name ?? "Desconocido",
        PrimaryMuscleGroup: ex?.PrimaryMuscleGroup.ToString().ToLowerInvariant() ?? "chest",
        Equipment: ex?.Equipment.ToString().ToLowerInvariant() ?? "barbell",
        GifUrl: ex?.GifUrl ?? "",
        SetOrder: s.SetOrder,
        SetType: s.SetType == SetType.DropSet ? "drop_set" : s.SetType.ToString().ToLowerInvariant(),
        WeightKg: s.WeightKg,
        Reps: s.Reps,
        Rpe: s.Rpe,
        Rir: s.Rir,
        IsCompleted: s.IsCompleted,
        CompletedAt: s.CompletedAt,
        GhostReference: ghost
    );

    private static string GenerateSlug(string text)
    {
        var str = text.ToLowerInvariant().Trim();
        str = System.Text.RegularExpressions.Regex.Replace(str, @"[^a-z0-9\s-]", "");
        str = System.Text.RegularExpressions.Regex.Replace(str, @"\s+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(str) ? "ejercicio" : str;
    }

    #endregion
}
