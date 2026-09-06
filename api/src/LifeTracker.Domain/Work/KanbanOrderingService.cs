namespace LifeTracker.Domain.Work;

public class KanbanOrderingService : IKanbanOrderingService
{
    public void ReorderWithinColumn(List<WorkTask> columnTasks, Guid taskId, int targetPosition)
    {
        if (columnTasks == null || columnTasks.Count == 0)
            return;

        var taskIndex = columnTasks.FindIndex(t => t.Id == taskId);
        if (taskIndex < 0)
            return;

        var task = columnTasks[taskIndex];
        columnTasks.RemoveAt(taskIndex);

        var clampedPos = Math.Clamp(targetPosition, 0, columnTasks.Count);
        columnTasks.Insert(clampedPos, task);

        for (int i = 0; i < columnTasks.Count; i++)
        {
            columnTasks[i].MoveTo(columnTasks[i].Status, i);
        }
    }

    public void MoveAcrossColumns(
        List<WorkTask> sourceColumnTasks,
        List<WorkTask> targetColumnTasks,
        Guid taskId,
        WorkTaskStatus targetStatus,
        int targetPosition)
    {
        if (sourceColumnTasks == null || targetColumnTasks == null)
            return;

        var taskIndex = sourceColumnTasks.FindIndex(t => t.Id == taskId);
        if (taskIndex < 0)
            return;

        var task = sourceColumnTasks[taskIndex];
        sourceColumnTasks.RemoveAt(taskIndex);

        for (int i = 0; i < sourceColumnTasks.Count; i++)
        {
            sourceColumnTasks[i].MoveTo(sourceColumnTasks[i].Status, i);
        }

        var clampedPos = Math.Clamp(targetPosition, 0, targetColumnTasks.Count);
        task.MoveTo(targetStatus, clampedPos);
        targetColumnTasks.Insert(clampedPos, task);

        for (int i = 0; i < targetColumnTasks.Count; i++)
        {
            targetColumnTasks[i].MoveTo(targetStatus, i);
        }
    }
}
