using LifeTracker.Domain.Common;

namespace LifeTracker.Domain.Timeline;

public class DailyLog : BaseEntity
{
    public Guid UserId { get; private set; }
    public DateOnly Date { get; private set; }
    public short? MoodScore { get; private set; }
    public short? EnergyScore { get; private set; }
    public string? SummaryText { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    private DailyLog() { }

    public DailyLog(Guid userId, DateOnly date, short? moodScore = null, short? energyScore = null, string? summaryText = null)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("El ID de usuario no puede estar vacío.", nameof(userId));

        ValidateScores(moodScore, energyScore);

        UserId = userId;
        Date = date;
        MoodScore = moodScore;
        EnergyScore = energyScore;
        SummaryText = summaryText?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateLog(short? moodScore, short? energyScore, string? summaryText)
    {
        ValidateScores(moodScore, energyScore);
        MoodScore = moodScore;
        EnergyScore = energyScore;
        SummaryText = summaryText?.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateScores(short? mood, short? energy)
    {
        if (mood is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(mood), "El estado de ánimo debe estar entre 1 y 5.");

        if (energy is < 1 or > 5)
            throw new ArgumentOutOfRangeException(nameof(energy), "El nivel de energía debe estar entre 1 y 5.");
    }
}
