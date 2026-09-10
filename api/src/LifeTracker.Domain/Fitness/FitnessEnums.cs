namespace LifeTracker.Domain.Fitness;

public enum FitnessDiscipline
{
    Strength,
    Cardio,
    Calisthenics,
    Mobility
}

public enum MuscleGroup
{
    Chest,
    UpperChest,
    Lats,
    Rhomboids,
    Traps,
    LowerBack,
    AnteriorDeltoid,
    LateralDeltoid,
    PosteriorDeltoid,
    Biceps,
    Triceps,
    Forearms,
    Quadriceps,
    Hamstrings,
    Glutes,
    Calves,
    Abs,
    Obliques
}

public enum EquipmentType
{
    Barbell,
    Dumbbell,
    Machine,
    Cable,
    Bodyweight,
    Kettlebell,
    SmithMachine,
    Bands,
    Other
}

public enum WorkoutStatus
{
    Active,
    Completed,
    Discarded
}

public enum SetType
{
    Normal,
    Warmup,
    DropSet,
    Failure
}
