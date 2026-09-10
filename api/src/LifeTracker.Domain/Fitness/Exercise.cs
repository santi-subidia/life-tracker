using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Fitness;

public class Exercise : BaseEntity
{
    public Guid? UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public FitnessDiscipline Discipline { get; private set; }
    public MuscleGroup PrimaryMuscleGroup { get; private set; }
    public List<MuscleStimulus> MuscleStimulus { get; private set; } = [];
    public EquipmentType Equipment { get; private set; }
    public List<string> Instructions { get; private set; } = [];
    public string GifUrl { get; private set; } = string.Empty;
    public string? VideoUrl { get; private set; }
    public bool IsCustom { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private Exercise() { }

    public Exercise(
        Guid? userId,
        string name,
        string slug,
        FitnessDiscipline discipline,
        MuscleGroup primaryMuscleGroup,
        IEnumerable<MuscleStimulus> stimulusList,
        EquipmentType equipment,
        IEnumerable<string>? instructions = null,
        string? gifUrl = null,
        string? videoUrl = null,
        bool isCustom = false)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre del ejercicio no puede estar vacío.", nameof(name));

        if (string.IsNullOrWhiteSpace(slug))
            throw new ArgumentException("El slug del ejercicio no puede estar vacío.", nameof(slug));

        var stimuli = stimulusList?.ToList() ?? [];
        ValidateInvariants(isCustom, userId, stimuli);

        UserId = userId;
        Name = name.Trim();
        Slug = slug.Trim().ToLowerInvariant();
        Discipline = discipline;
        PrimaryMuscleGroup = primaryMuscleGroup;
        MuscleStimulus = stimuli;
        Equipment = equipment;
        Instructions = instructions?.ToList() ?? [];
        GifUrl = gifUrl?.Trim() ?? string.Empty;
        VideoUrl = string.IsNullOrWhiteSpace(videoUrl) ? null : videoUrl.Trim();
        IsCustom = isCustom;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(
        string name,
        FitnessDiscipline discipline,
        MuscleGroup primaryMuscleGroup,
        IEnumerable<MuscleStimulus> stimulusList,
        EquipmentType equipment,
        IEnumerable<string>? instructions = null,
        string? gifUrl = null,
        string? videoUrl = null)
    {
        if (!IsCustom)
            throw new InvalidOperationException("No se pueden modificar ejercicios oficiales del catálogo base.");

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("El nombre del ejercicio no puede estar vacío.", nameof(name));

        var stimuli = stimulusList?.ToList() ?? [];
        ValidateInvariants(IsCustom, UserId, stimuli);

        Name = name.Trim();
        Discipline = discipline;
        PrimaryMuscleGroup = primaryMuscleGroup;
        MuscleStimulus = stimuli;
        Equipment = equipment;
        Instructions = instructions?.ToList() ?? [];
        GifUrl = gifUrl?.Trim() ?? string.Empty;
        VideoUrl = string.IsNullOrWhiteSpace(videoUrl) ? null : videoUrl.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateInvariants(bool isCustom, Guid? userId, List<MuscleStimulus> stimuli)
    {
        // Invariante 11: Catálogo oficial debe ser user_id null; personalizados deben tener user_id
        if (!isCustom && userId.HasValue)
            throw new InvalidOperationException("Un ejercicio oficial del catálogo base no puede tener UserId asignado.");

        if (isCustom && !userId.HasValue)
            throw new InvalidOperationException("Un ejercicio personalizado debe pertenecer a un usuario.");

        // Invariante 8: Debe poseer obligatoriamente al menos un motor primario con ponderación del 100%
        if (!stimuli.Exists(s => s.StimulusPct == 100))
            throw new InvalidOperationException("Invariante 8 violada: Todo ejercicio debe poseer al menos un motor primario con 100% de ponderación.");
    }
}
