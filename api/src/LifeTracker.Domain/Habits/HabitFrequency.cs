namespace LifeTracker.Domain.Habits;

public enum FrequencyType
{
    Daily = 1,
    SpecificDays = 2,
    TimesPerWeek = 3
}

public record HabitFrequency
{
    public FrequencyType Type { get; init; } = FrequencyType.Daily;
    public int? TargetDaysPerWeek { get; init; }
    public IReadOnlyList<DayOfWeek>? SpecificDays { get; init; }

    public static HabitFrequency Daily() => new() { Type = FrequencyType.Daily };

    public static HabitFrequency Specific(params DayOfWeek[] days)
    {
        if (days == null || days.Length == 0)
            throw new ArgumentException("Debe especificar al menos un día de la semana.", nameof(days));

        return new HabitFrequency
        {
            Type = FrequencyType.SpecificDays,
            SpecificDays = days.Distinct().OrderBy(d => d).ToList()
        };
    }

    public static HabitFrequency TimesPerWeek(int targetDays)
    {
        if (targetDays is < 1 or > 7)
            throw new ArgumentOutOfRangeException(nameof(targetDays), "La meta semanal debe estar entre 1 y 7 días.");

        return new HabitFrequency
        {
            Type = FrequencyType.TimesPerWeek,
            TargetDaysPerWeek = targetDays
        };
    }

    public bool IsScheduledFor(DateOnly date)
    {
        return Type switch
        {
            FrequencyType.Daily => true,
            FrequencyType.SpecificDays => SpecificDays?.Contains(date.DayOfWeek) ?? false,
            FrequencyType.TimesPerWeek => true, // En flexible, cualquier día de la semana puede ser el elegido
            _ => true
        };
    }
}
