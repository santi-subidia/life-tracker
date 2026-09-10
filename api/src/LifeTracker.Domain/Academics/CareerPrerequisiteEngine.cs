namespace LifeTracker.Domain.Academics;

public class CareerPrerequisiteEngine : ICareerPrerequisiteEngine
{
    public GraphValidationResult ValidateAcyclicGraph(
        IReadOnlyCollection<CurriculumSubject> subjects,
        IReadOnlyCollection<CurriculumPrerequisite> prerequisites)
    {
        var subjectIds = subjects.Select(s => s.Id).ToHashSet();
        var inDegree = subjects.ToDictionary(s => s.Id, _ => 0);
        var adjacencyList = subjects.ToDictionary(s => s.Id, _ => new List<Guid>());

        foreach (var prereq in prerequisites)
        {
            // Validar que ambos extremos existan en el conjunto de materias
            if (!subjectIds.Contains(prereq.SubjectId) || !subjectIds.Contains(prereq.RequiredSubjectId))
            {
                return new GraphValidationResult(false, "Una de las materias correlativas no pertenece al plan.");
            }

            if (prereq.SubjectId == prereq.RequiredSubjectId)
            {
                return new GraphValidationResult(false, "Una materia no puede ser correlativa de sí misma.");
            }

            // Arista dirigida: RequiredSubject -> Subject
            adjacencyList[prereq.RequiredSubjectId].Add(prereq.SubjectId);
            inDegree[prereq.SubjectId]++;
        }

        // Algoritmo de Kahn
        var queue = new Queue<Guid>(inDegree.Where(kvp => kvp.Value == 0).Select(kvp => kvp.Key));
        int visitedCount = 0;

        while (queue.Count > 0)
        {
            var u = queue.Dequeue();
            visitedCount++;

            foreach (var v in adjacencyList[u])
            {
                inDegree[v]--;
                if (inDegree[v] == 0)
                {
                    queue.Enqueue(v);
                }
            }
        }

        if (visitedCount == subjects.Count)
        {
            return new GraphValidationResult(true);
        }

        // Si visitedCount < subjects.Count, existe un ciclo. Usar DFS para reconstruir el ciclo exacto.
        var cycle = FindCycleDfs(subjects, adjacencyList);
        var subjectNameMap = subjects.ToDictionary(s => s.Id, s => !string.IsNullOrWhiteSpace(s.Code) ? s.Code : s.Name);
        var readableCycle = cycle.Select(id => subjectNameMap.GetValueOrDefault(id, id.ToString())).ToList();

        return new GraphValidationResult(
            false, 
            $"Se detectó una dependencia circular cíclica: {string.Join(" -> ", readableCycle)}", 
            readableCycle);
    }

    public IReadOnlyList<SubjectEligibilityResult> EvaluateEligibility(
        IReadOnlyCollection<CurriculumSubject> subjects,
        IReadOnlyCollection<CurriculumPrerequisite> prerequisites,
        IReadOnlyDictionary<Guid, SubjectStatus> studentSubjectStatuses)
    {
        var subjectMap = subjects.ToDictionary(s => s.Id);
        var prereqsBySubject = prerequisites
            .GroupBy(p => p.SubjectId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var results = new List<SubjectEligibilityResult>();

        foreach (var subject in subjects)
        {
            bool hasStatus = studentSubjectStatuses.TryGetValue(subject.Id, out var currentStatus);

            if (hasStatus)
            {
                if (currentStatus == SubjectStatus.Aprobada)
                {
                    results.Add(new SubjectEligibilityResult(
                        subject.Id, subject.Code ?? string.Empty, subject.Name,
                        subject.YearLevel, subject.PeriodNumber,
                        CurriculumSubjectStatus.Aprobada,
                        Array.Empty<MissingPrerequisiteInfo>()));
                    continue;
                }

                if (currentStatus == SubjectStatus.Regularizada)
                {
                    results.Add(new SubjectEligibilityResult(
                        subject.Id, subject.Code ?? string.Empty, subject.Name,
                        subject.YearLevel, subject.PeriodNumber,
                        CurriculumSubjectStatus.Regularizada,
                        Array.Empty<MissingPrerequisiteInfo>()));
                    continue;
                }

                if (currentStatus == SubjectStatus.EnCurso)
                {
                    results.Add(new SubjectEligibilityResult(
                        subject.Id, subject.Code ?? string.Empty, subject.Name,
                        subject.YearLevel, subject.PeriodNumber,
                        CurriculumSubjectStatus.EnCurso,
                        Array.Empty<MissingPrerequisiteInfo>()));
                    continue;
                }
            }

            // Evaluar dependencias
            var missingPrereqs = new List<MissingPrerequisiteInfo>();
            if (prereqsBySubject.TryGetValue(subject.Id, out var reqList))
            {
                foreach (var req in reqList)
                {
                    bool reqHasStatus = studentSubjectStatuses.TryGetValue(req.RequiredSubjectId, out var reqStatus);
                    var reqSubject = subjectMap.TryGetValue(req.RequiredSubjectId, out var s) ? s : null;

                    bool satisfied = reqHasStatus && req.RequirementType switch
                    {
                        PrerequisiteRequirementType.RequiereRegularizada =>
                            reqStatus == SubjectStatus.Regularizada || reqStatus == SubjectStatus.Aprobada,
                        PrerequisiteRequirementType.RequiereAprobada =>
                            reqStatus == SubjectStatus.Aprobada,
                        _ => false
                    };

                    if (!satisfied)
                    {
                        missingPrereqs.Add(new MissingPrerequisiteInfo(
                            req.RequiredSubjectId,
                            reqSubject?.Code ?? string.Empty,
                            reqSubject?.Name ?? string.Empty,
                            req.RequirementType,
                            reqHasStatus ? reqStatus : null));
                    }
                }
            }

            var status = missingPrereqs.Count == 0 
                ? CurriculumSubjectStatus.Habilitada 
                : CurriculumSubjectStatus.Bloqueada;

            results.Add(new SubjectEligibilityResult(
                subject.Id, subject.Code ?? string.Empty, subject.Name,
                subject.YearLevel, subject.PeriodNumber,
                status,
                missingPrereqs));
        }

        return results;
    }

    public CareerRecommendationResult GenerateNextTermRecommendations(
        CareerPlan plan,
        IReadOnlyCollection<CurriculumPrerequisite> prerequisites,
        IReadOnlyDictionary<Guid, SubjectStatus> studentSubjectStatuses,
        int quotaLimit = 4)
    {
        var subjects = plan.Subjects.ToList();
        if (subjects.Count == 0)
        {
            return new CareerRecommendationResult(
                plan.Id, 0, quotaLimit,
                Array.Empty<SubjectRecommendation>(),
                Array.Empty<SubjectRecommendation>(),
                Array.Empty<SubjectEligibilityResult>());
        }

        var validation = ValidateAcyclicGraph(subjects, prerequisites);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException($"Grafo no válido: {validation.ErrorMessage}");
        }

        var eligibility = EvaluateEligibility(subjects, prerequisites, studentSubjectStatuses);
        var subjectMap = subjects.ToDictionary(s => s.Id);

        // Materias habilitadas que aún no han sido aprobadas ni están en curso
        var eligibleSubjects = eligibility
            .Where(e => e.Status == CurriculumSubjectStatus.Habilitada)
            .Select(e => subjectMap[e.SubjectId])
            .ToList();

        var blockedSubjects = eligibility
            .Where(e => e.Status == CurriculumSubjectStatus.Bloqueada)
            .ToList();

        if (eligibleSubjects.Count == 0)
        {
            return new CareerRecommendationResult(
                plan.Id, 0, quotaLimit,
                Array.Empty<SubjectRecommendation>(),
                Array.Empty<SubjectRecommendation>(),
                blockedSubjects);
        }

        // Construir listas de adyacencia forward
        var forwardAdj = subjects.ToDictionary(s => s.Id, _ => new List<Guid>());
        foreach (var p in prerequisites)
        {
            if (forwardAdj.TryGetValue(p.RequiredSubjectId, out var list))
            {
                list.Add(p.SubjectId);
            }
        }

        // Calcular Fan-Out transitivo para cada materia
        var fanOutMap = new Dictionary<Guid, int>();
        foreach (var s in subjects)
        {
            fanOutMap[s.Id] = CalculateTransitiveFanOut(s.Id, forwardAdj);
        }

        // Calcular Critical Path Depth mediante orden topológico reverso
        var depthMap = CalculateCriticalPathDepths(subjects, forwardAdj);

        int maxDepth = depthMap.Values.DefaultIfEmpty(1).Max();
        int maxFanOut = fanOutMap.Values.DefaultIfEmpty(1).Max();

        // Determinar año estimado del alumno
        int studentActiveYear = CalculateCurrentStudentYearLevel(subjects, studentSubjectStatuses);

        var scoredRecommendations = new List<SubjectRecommendation>();

        foreach (var subject in eligibleSubjects)
        {
            int depth = depthMap[subject.Id];
            int fanOut = fanOutMap[subject.Id];

            double normDepth = (double)depth / Math.Max(1, maxDepth) * 100.0;
            double normFanOut = (double)fanOut / Math.Max(1, maxFanOut) * 100.0;
            double delayFactor = Math.Max(0, (studentActiveYear - subject.YearLevel) / 4.0) * 100.0;

            double score = (0.45 * normDepth) + (0.35 * normFanOut) + (0.20 * delayFactor);

            string badge;
            string justification;

            if (depth >= 4 || (depth == maxDepth && fanOut > 0))
            {
                badge = "Camino Crítico";
                justification = fanOut > 0
                    ? $"Cuello de botella troncal: desbloquea {fanOut} materias posteriores con profundidad de {depth} semestres."
                    : $"Materia prioritaria en el camino crítico ({depth} niveles de profundidad restante).";
            }
            else if (fanOut >= 4)
            {
                badge = "Desbloqueo Alto";
                justification = $"Gran impacto de avance: desbloquea {fanOut} asignaturas directas e indirectas.";
            }
            else if (subject.YearLevel < studentActiveYear)
            {
                badge = "Troncal Pendiente";
                justification = $"Materia troncal de {subject.YearLevel}° año postergada. Regularizarla evita futuros bloqueos.";
            }
            else if (fanOut == 0)
            {
                badge = "Materia Terminal";
                justification = "Asignatura terminal que no bloquea correlativas posteriores.";
            }
            else
            {
                badge = "Avance Regular";
                justification = $"Desbloquea {fanOut} materias posteriores de la currícula.";
            }

            scoredRecommendations.Add(new SubjectRecommendation(
                subject.Id,
                subject.Code ?? string.Empty,
                subject.Name,
                subject.YearLevel,
                subject.PeriodNumber,
                Math.Round(score, 1),
                depth,
                fanOut,
                badge,
                justification));
        }

        var sorted = scoredRecommendations
            .OrderByDescending(r => r.PriorityScore)
            .ThenBy(r => r.YearLevel)
            .ThenBy(r => r.PeriodNumber)
            .ToList();

        var topRecommendations = sorted.Take(quotaLimit).ToList();
        var otherEligible = sorted.Skip(quotaLimit).ToList();

        return new CareerRecommendationResult(
            plan.Id,
            eligibleSubjects.Count,
            quotaLimit,
            topRecommendations,
            otherEligible,
            blockedSubjects);
    }

    private static int CalculateTransitiveFanOut(Guid startNode, Dictionary<Guid, List<Guid>> forwardAdj)
    {
        var visited = new HashSet<Guid>();
        var queue = new Queue<Guid>();
        queue.Enqueue(startNode);

        while (queue.Count > 0)
        {
            var curr = queue.Dequeue();
            if (forwardAdj.TryGetValue(curr, out var nextList))
            {
                foreach (var next in nextList)
                {
                    if (visited.Add(next))
                    {
                        queue.Enqueue(next);
                    }
                }
            }
        }

        return visited.Count;
    }

    private static Dictionary<Guid, int> CalculateCriticalPathDepths(
        IReadOnlyCollection<CurriculumSubject> subjects, 
        Dictionary<Guid, List<Guid>> forwardAdj)
    {
        var memo = new Dictionary<Guid, int>();

        int DfsDepth(Guid u)
        {
            if (memo.TryGetValue(u, out int d)) return d;

            if (!forwardAdj.TryGetValue(u, out var successors) || successors.Count == 0)
            {
                memo[u] = 1;
                return 1;
            }

            int maxChild = 0;
            foreach (var v in successors)
            {
                maxChild = Math.Max(maxChild, DfsDepth(v));
            }

            memo[u] = 1 + maxChild;
            return memo[u];
        }

        foreach (var s in subjects)
        {
            DfsDepth(s.Id);
        }

        return memo;
    }

    private static int CalculateCurrentStudentYearLevel(
        IReadOnlyCollection<CurriculumSubject> subjects, 
        IReadOnlyDictionary<Guid, SubjectStatus> statuses)
    {
        var activeYears = subjects
            .Where(s => statuses.TryGetValue(s.Id, out var st) && (st == SubjectStatus.EnCurso || st == SubjectStatus.Regularizada))
            .Select(s => s.YearLevel)
            .ToList();

        if (activeYears.Count > 0)
        {
            return (int)Math.Ceiling(activeYears.Average());
        }

        var approvedYears = subjects
            .Where(s => statuses.TryGetValue(s.Id, out var st) && st == SubjectStatus.Aprobada)
            .Select(s => s.YearLevel)
            .ToList();

        if (approvedYears.Count > 0)
        {
            return Math.Min(10, approvedYears.Max() + 1);
        }

        return 1;
    }

    private static List<Guid> FindCycleDfs(
        IReadOnlyCollection<CurriculumSubject> subjects, 
        Dictionary<Guid, List<Guid>> adjacencyList)
    {
        var state = subjects.ToDictionary(s => s.Id, _ => 0); // 0 = Blanco, 1 = Gris, 2 = Negro
        var parent = new Dictionary<Guid, Guid>();
        var cycle = new List<Guid>();

        bool Dfs(Guid u)
        {
            state[u] = 1;

            if (adjacencyList.TryGetValue(u, out var neighbors))
            {
                foreach (var v in neighbors)
                {
                    if (state.TryGetValue(v, out int vState) && vState == 1) // Cycle found
                    {
                        cycle.Add(v);
                        var curr = u;
                        while (curr != v)
                        {
                            cycle.Add(curr);
                            curr = parent.GetValueOrDefault(curr, v);
                        }
                        cycle.Add(v);
                        cycle.Reverse();
                        return true;
                    }

                    if (state.TryGetValue(v, out int vSt) && vSt == 0)
                    {
                        parent[v] = u;
                        if (Dfs(v)) return true;
                    }
                }
            }

            state[u] = 2;
            return false;
        }

        foreach (var s in subjects)
        {
            if (state[s.Id] == 0 && Dfs(s.Id))
            {
                return cycle;
            }
        }

        return cycle;
    }
}
