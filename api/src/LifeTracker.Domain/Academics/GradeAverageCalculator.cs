namespace LifeTracker.Domain.Academics;

public class GradeAverageCalculator : IGradeAverageCalculator
{
    public decimal? CalculateSubjectAverage(IEnumerable<AcademicMilestone> milestones)
    {
        var allMilestones = milestones?.ToList() ?? [];
        if (!allMilestones.Any(m => m.Grade.HasValue))
            return null;

        var replacedIds = new HashSet<Guid>();
        var inheritedWeights = new Dictionary<Guid, decimal?>();

        // 1. Reemplazos explícitos vía ReplacesMilestoneId
        foreach (var rec in allMilestones.Where(m => m.Grade.HasValue && m.ReplacesMilestoneId.HasValue))
        {
            var targetId = rec.ReplacesMilestoneId!.Value;
            var replaced = allMilestones.FirstOrDefault(m => m.Id == targetId);
            if (replaced != null)
            {
                replacedIds.Add(replaced.Id);
                if ((!rec.WeightPercentage.HasValue || rec.WeightPercentage.Value == 0) && replaced.WeightPercentage.HasValue)
                {
                    inheritedWeights[rec.Id] = replaced.WeightPercentage.Value;
                }
            }
        }

        // 2. Recuperatorios implícitos (tipo Recuperatorio sin ReplacesMilestoneId)
        foreach (var rec in allMilestones
            .Where(m => m.Grade.HasValue && !m.ReplacesMilestoneId.HasValue && m.MilestoneType == MilestoneType.Recuperatorio)
            .OrderBy(m => m.DueDate))
        {
            var failedCandidate = allMilestones
                .Where(m => m.Grade.HasValue && m.Grade < 4.0m && m.MilestoneType != MilestoneType.Recuperatorio && !replacedIds.Contains(m.Id))
                .OrderBy(m => m.DueDate)
                .FirstOrDefault();

            if (failedCandidate != null)
            {
                replacedIds.Add(failedCandidate.Id);
                if ((!rec.WeightPercentage.HasValue || rec.WeightPercentage.Value == 0) && failedCandidate.WeightPercentage.HasValue)
                {
                    inheritedWeights[rec.Id] = failedCandidate.WeightPercentage.Value;
                }
            }
        }

        // 3. Filtrar hitos calificados activos (excluyendo reemplazados)
        var activeGraded = allMilestones
            .Where(m => m.Grade.HasValue && !replacedIds.Contains(m.Id))
            .ToList();

        if (activeGraded.Count == 0)
            return null;

        decimal? GetEffectiveWeight(AcademicMilestone m)
        {
            if (m.WeightPercentage.HasValue && m.WeightPercentage.Value > 0)
                return m.WeightPercentage.Value;
            if (inheritedWeights.TryGetValue(m.Id, out var inherited) && inherited.HasValue && inherited.Value > 0)
                return inherited.Value;
            return null;
        }

        var withWeight = activeGraded.Where(m => GetEffectiveWeight(m).HasValue).ToList();
        var withoutWeight = activeGraded.Where(m => !GetEffectiveWeight(m).HasValue).ToList();

        // Caso C: Todos sin ponderación (o peso 0) -> media aritmética simple
        if (withWeight.Count == 0)
        {
            return Math.Round(activeGraded.Average(m => m.Grade!.Value), 2, MidpointRounding.AwayFromZero);
        }

        // Caso A y B: Todos tienen ponderación -> media ponderada normalizada
        if (withoutWeight.Count == 0)
        {
            decimal totalWeight = withWeight.Sum(m => GetEffectiveWeight(m)!.Value);
            if (totalWeight == 0)
            {
                return Math.Round(activeGraded.Average(m => m.Grade!.Value), 2, MidpointRounding.AwayFromZero);
            }

            decimal weightedSum = withWeight.Sum(m => m.Grade!.Value * GetEffectiveWeight(m)!.Value);
            return Math.Round(weightedSum / totalWeight, 2, MidpointRounding.AwayFromZero);
        }

        // Caso D: Ponderación mixta
        decimal explicitSum = withWeight.Sum(m => GetEffectiveWeight(m)!.Value);
        if (explicitSum < 100m)
        {
            decimal remaining = 100m - explicitSum;
            decimal perMilestoneWeight = remaining / withoutWeight.Count;
            decimal sum = withWeight.Sum(m => m.Grade!.Value * GetEffectiveWeight(m)!.Value)
                          + withoutWeight.Sum(m => m.Grade!.Value * perMilestoneWeight);
            return Math.Round(sum / 100m, 2, MidpointRounding.AwayFromZero);
        }
        else
        {
            // Si la suma ya alcanza o supera 100, fallback a media aritmética simple
            return Math.Round(activeGraded.Average(m => m.Grade!.Value), 2, MidpointRounding.AwayFromZero);
        }
    }

    public decimal? CalculateCareerAverage(IEnumerable<SubjectGradeSummary> subjects)
    {
        var approved = (subjects ?? [])
            .Where(s => s.Status == SubjectStatus.Aprobada && s.FinalOrAverageGrade.HasValue)
            .ToList();

        if (approved.Count == 0)
            return null;

        decimal avg = approved.Average(s => s.FinalOrAverageGrade!.Value);
        return Math.Round(avg, 2, MidpointRounding.AwayFromZero);
    }
}
