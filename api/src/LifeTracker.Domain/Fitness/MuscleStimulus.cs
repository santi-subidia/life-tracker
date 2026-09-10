using System.Text.Json.Serialization;

namespace LifeTracker.Domain.Fitness;

public sealed record MuscleStimulus
{
    [JsonPropertyName("muscle")]
    public string Muscle { get; init; } = string.Empty;

    [JsonPropertyName("stimulus_pct")]
    public int StimulusPct { get; init; }

    [JsonConstructor]
    public MuscleStimulus(string muscle, int stimulusPct)
    {
        if (string.IsNullOrWhiteSpace(muscle))
            throw new ArgumentException("El grupo muscular no puede estar vacío.", nameof(muscle));

        if (stimulusPct < 1 || stimulusPct > 100)
            throw new ArgumentOutOfRangeException(nameof(stimulusPct), "El porcentaje de estímulo debe estar comprendido entre 1 y 100.");

        Muscle = muscle.Trim().ToLowerInvariant();
        StimulusPct = stimulusPct;
    }

    public static MuscleStimulus Create(MuscleGroup muscleGroup, int pct)
    {
        return new MuscleStimulus(muscleGroup.ToString().ToLowerInvariant(), pct);
    }
}
