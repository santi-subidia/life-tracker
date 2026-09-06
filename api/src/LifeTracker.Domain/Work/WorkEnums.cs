namespace LifeTracker.Domain.Work;

public enum WorkProjectStatus
{
    Active,
    Paused,
    Completed
}

public enum WorkTaskStatus
{
    Backlog,
    Todo,
    InProgress,
    Done
}

public enum WorkTaskPriority
{
    Low,
    Medium,
    High,
    Urgent
}
