namespace LifeTracker.Domain.Work;

public interface IKanbanOrderingService
{
    void ReorderWithinColumn(List<WorkTask> columnTasks, Guid taskId, int targetPosition);
    void MoveAcrossColumns(List<WorkTask> sourceColumnTasks, List<WorkTask> targetColumnTasks, Guid taskId, WorkTaskStatus targetStatus, int targetPosition);
}
