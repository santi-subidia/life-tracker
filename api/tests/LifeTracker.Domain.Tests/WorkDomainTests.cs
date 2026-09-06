using LifeTracker.Domain.Academics;
using LifeTracker.Domain.Work;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class WorkDomainTests
{
    [Fact]
    public void KanbanOrdering_ReorderWithinColumn_ShouldMaintainContiguousZeroBasedPositions()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var orderingService = new KanbanOrderingService();
        var task0 = new WorkTask(userId, "Tarea 0", position: 0);
        var task1 = new WorkTask(userId, "Tarea 1", position: 1);
        var task2 = new WorkTask(userId, "Tarea 2", position: 2);
        var tasks = new List<WorkTask> { task0, task1, task2 };

        // Act: mover task0 a la posición 2
        orderingService.ReorderWithinColumn(tasks, task0.Id, 2);

        // Assert: orden resultante debe ser task1 (pos 0), task2 (pos 1), task0 (pos 2)
        Assert.Equal(task1.Id, tasks[0].Id);
        Assert.Equal(0, tasks[0].Position);

        Assert.Equal(task2.Id, tasks[1].Id);
        Assert.Equal(1, tasks[1].Position);

        Assert.Equal(task0.Id, tasks[2].Id);
        Assert.Equal(2, tasks[2].Position);
    }

    [Fact]
    public void KanbanOrdering_MoveAcrossColumns_ShouldUpdateStatusAndReindexBothColumns()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var orderingService = new KanbanOrderingService();

        var todoTask0 = new WorkTask(userId, "Todo 0", status: WorkTaskStatus.Todo, position: 0);
        var todoTask1 = new WorkTask(userId, "Todo 1", status: WorkTaskStatus.Todo, position: 1);
        var sourceList = new List<WorkTask> { todoTask0, todoTask1 };

        var progressTask0 = new WorkTask(userId, "Prog 0", status: WorkTaskStatus.InProgress, position: 0);
        var targetList = new List<WorkTask> { progressTask0 };

        // Act: mover todoTask0 al principio de InProgress (pos 0)
        orderingService.MoveAcrossColumns(sourceList, targetList, todoTask0.Id, WorkTaskStatus.InProgress, 0);

        // Assert:
        // Columna origen: solo queda todoTask1 con posición 0
        Assert.Single(sourceList);
        Assert.Equal(todoTask1.Id, sourceList[0].Id);
        Assert.Equal(0, sourceList[0].Position);

        // Columna destino: todoTask0 primero (pos 0), progressTask0 segundo (pos 1)
        Assert.Equal(2, targetList.Count);
        Assert.Equal(todoTask0.Id, targetList[0].Id);
        Assert.Equal(WorkTaskStatus.InProgress, targetList[0].Status);
        Assert.Equal(0, targetList[0].Position);

        Assert.Equal(progressTask0.Id, targetList[1].Id);
        Assert.Equal(WorkTaskStatus.InProgress, targetList[1].Status);
        Assert.Equal(1, targetList[1].Position);
    }

    [Fact]
    public void WorkSession_EndedAtBeforeStartedAt_ShouldThrowArgumentException()
    {
        var userId = Guid.NewGuid();
        var startedAt = new DateTime(2026, 9, 6, 14, 0, 0, DateTimeKind.Utc);
        var endedAt = new DateTime(2026, 9, 6, 13, 0, 0, DateTimeKind.Utc);

        Assert.Throws<ArgumentException>(() =>
            new WorkSession(userId, null, null, startedAt, endedAt, "Nota"));
    }

    [Fact]
    public void WorkSession_ValidDates_ShouldCalculateDurationMinutes()
    {
        var userId = Guid.NewGuid();
        var startedAt = new DateTime(2026, 9, 6, 14, 0, 0, DateTimeKind.Utc);
        var endedAt = new DateTime(2026, 9, 6, 14, 50, 0, DateTimeKind.Utc);

        var session = new WorkSession(userId, null, null, startedAt, endedAt, "Sesión de foco");

        Assert.Equal(50, session.DurationMinutes);
        Assert.Equal("Sesión de foco", session.Notes);
    }

    [Fact]
    public void FocusMetricsCalculator_CalculatesWeeklyAndDailyMinutesCorrectly()
    {
        // Arrange
        // Referencia: Domingo 6 de Septiembre de 2026 (Lunes 31 de Agosto fue inicio de semana)
        var referenceUtc = new DateTime(2026, 9, 6, 18, 0, 0, DateTimeKind.Utc);
        var userId = Guid.NewGuid();

        var sessionToday = new WorkSession(userId, null, null,
            new DateTime(2026, 9, 6, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 9, 6, 11, 0, 0, DateTimeKind.Utc)); // 60 min hoy y esta semana

        var sessionWednesday = new WorkSession(userId, null, null,
            new DateTime(2026, 9, 2, 15, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 9, 2, 16, 30, 0, DateTimeKind.Utc)); // 90 min esta semana (no hoy)

        var sessionLastWeek = new WorkSession(userId, null, null,
            new DateTime(2026, 8, 25, 10, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 25, 11, 0, 0, DateTimeKind.Utc)); // Semana pasada

        var taskDoneToday = new WorkTask(userId, "Tarea Hoy", status: WorkTaskStatus.Done);
        // Simular UpdatedAt hoy
        taskDoneToday.MoveTo(WorkTaskStatus.Done, 0);

        var taskDoneWednesday = new WorkTask(userId, "Tarea Miércoles", status: WorkTaskStatus.Done);
        taskDoneWednesday.MoveTo(WorkTaskStatus.Done, 1);
        // Modificar UpdatedAt por reflexión para simular que ocurrió el 2 de sept
        typeof(WorkTask).GetProperty("UpdatedAt")!.SetValue(taskDoneWednesday, new DateTime(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc));

        var taskTodo = new WorkTask(userId, "Tarea Pendiente", status: WorkTaskStatus.Todo);

        var calculator = new FocusMetricsCalculator();

        // Act
        var metrics = calculator.Calculate(
            [sessionToday, sessionWednesday, sessionLastWeek],
            [taskDoneToday, taskDoneWednesday, taskTodo],
            referenceUtc
        );

        // Assert
        Assert.Equal(150, metrics.FocusMinutesThisWeek); // 60 + 90
        Assert.Equal(60, metrics.FocusMinutesToday); // 60
        Assert.Equal(2, metrics.SessionsCountThisWeek); // 2 sesiones esta semana
        Assert.Equal(2, metrics.CompletedTasksThisWeek); // 2 tareas done esta semana
        Assert.Equal(1, metrics.CompletedTasksToday); // 1 tarea done hoy
    }

    [Theory]
    [InlineData(-0.1)]
    [InlineData(10.1)]
    public void AcademicMilestone_AssignGradeOutOfBounds_ShouldThrowException(decimal invalidGrade)
    {
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();
        var milestone = new AcademicMilestone(userId, subjectId, "Parcial", MilestoneType.Parcial, new DateOnly(2026, 9, 10));

        Assert.Throws<ArgumentOutOfRangeException>(() => milestone.AssignGrade(invalidGrade));
    }
}
