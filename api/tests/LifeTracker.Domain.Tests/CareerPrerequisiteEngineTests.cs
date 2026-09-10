using LifeTracker.Domain.Academics;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class CareerPrerequisiteEngineTests
{
    private readonly CareerPrerequisiteEngine _engine = new();

    #region Helper Methods

    private static CareerPlan CreateTestPlan(Guid? userId = null, string name = "Ingeniería en Informática")
    {
        return new CareerPlan(userId ?? Guid.NewGuid(), name, "Universidad de Buenos Aires", 240, true);
    }

    private static CurriculumSubject CreateSubject(
        Guid planId,
        Guid userId,
        string code,
        string name,
        int yearLevel = 1,
        int periodNumber = 1,
        int? credits = 6,
        bool isOptional = false,
        int orderIndex = 0)
    {
        return new CurriculumSubject(planId, userId, name, yearLevel, periodNumber, code, credits, isOptional, orderIndex);
    }

    private static CurriculumPrerequisite CreatePrerequisite(
        Guid planId,
        Guid userId,
        Guid subjectId,
        Guid requiredSubjectId,
        PrerequisiteRequirementType requirementType = PrerequisiteRequirementType.RequiereRegularizada)
    {
        return new CurriculumPrerequisite(planId, userId, subjectId, requiredSubjectId, requirementType);
    }

    #endregion

    #region TSK-CP15: Pruebas de Validación de Grafo Acíclico (DAG)

    [Fact]
    public void ValidateAcyclicGraph_ShouldSucceed_WhenGraphIsAcyclic()
    {
        // Arrange: Grafo diamante (A -> B, A -> C, B -> D, C -> D)
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "MAT1", "Matemática 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "MAT2", "Matemática 2", 1, 2);
        var subC = CreateSubject(plan.Id, plan.UserId, "FIS1", "Física 1", 1, 2);
        var subD = CreateSubject(plan.Id, plan.UserId, "FIS2", "Física 2", 2, 1);

        var subjects = new[] { subA, subB, subC, subD };
        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subC.Id, subA.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subB.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subC.Id)
        };

        // Act
        var result = _engine.ValidateAcyclicGraph(subjects, prereqs);

        // Assert
        Assert.True(result.IsValid);
        Assert.Null(result.ErrorMessage);
        Assert.Null(result.CyclePath);
    }

    [Fact]
    public void ValidateAcyclicGraph_ShouldFail_WhenDirectCycleExists()
    {
        // Arrange: Ciclo directo (A -> B -> A)
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "ALG1", "Álgebra 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "ALG2", "Álgebra 2", 1, 2);

        var subjects = new[] { subA, subB };
        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subA.Id, subB.Id)
        };

        // Act
        var result = _engine.ValidateAcyclicGraph(subjects, prereqs);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
        Assert.Contains("ALG1", result.ErrorMessage);
        Assert.Contains("ALG2", result.ErrorMessage);
        Assert.NotNull(result.CyclePath);
        Assert.Contains("ALG1", result.CyclePath);
        Assert.Contains("ALG2", result.CyclePath);
    }

    [Fact]
    public void ValidateAcyclicGraph_ShouldFail_WhenTransitiveCycleExists()
    {
        // Arrange: Ciclo de 4 nodos (A -> B -> C -> D -> A)
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "SUB_A", "Materia A", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "SUB_B", "Materia B", 1, 2);
        var subC = CreateSubject(plan.Id, plan.UserId, "SUB_C", "Materia C", 2, 1);
        var subD = CreateSubject(plan.Id, plan.UserId, "SUB_D", "Materia D", 2, 2);

        var subjects = new[] { subA, subB, subC, subD };
        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subC.Id, subB.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subC.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subA.Id, subD.Id)
        };

        // Act
        var result = _engine.ValidateAcyclicGraph(subjects, prereqs);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
        Assert.NotNull(result.CyclePath);
        Assert.True(result.CyclePath.Count >= 4);
        Assert.Contains("SUB_A", result.CyclePath);
        Assert.Contains("SUB_B", result.CyclePath);
        Assert.Contains("SUB_C", result.CyclePath);
        Assert.Contains("SUB_D", result.CyclePath);
    }

    [Fact]
    public void ValidateAcyclicGraph_ShouldFail_WhenPrerequisiteReferencesNonExistentSubject()
    {
        // Arrange
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "PROG1", "Programación 1", 1, 1);
        var nonExistentId = Guid.NewGuid();

        var subjects = new[] { subA };
        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subA.Id, nonExistentId)
        };

        // Act
        var result = _engine.ValidateAcyclicGraph(subjects, prereqs);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
        Assert.Contains("no pertenece al plan", result.ErrorMessage);
    }

    #endregion

    #region TSK-CP16: Pruebas de Evaluación Semántica de Correlatividades

    [Fact]
    public void EvaluateEligibility_ShouldEnableSubject_WhenRequirementIsRequiereRegularizada_AndPredecessorIsRegularizada()
    {
        // Arrange
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "MAT1", "Matemática 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "MAT2", "Matemática 2", 1, 2);

        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id, PrerequisiteRequirementType.RequiereRegularizada)
        };

        var statuses = new Dictionary<Guid, SubjectStatus>
        {
            [subA.Id] = SubjectStatus.Regularizada
        };

        // Act
        var results = _engine.EvaluateEligibility(new[] { subA, subB }, prereqs, statuses);

        // Assert
        var resultB = results.First(r => r.SubjectId == subB.Id);
        Assert.Equal(CurriculumSubjectStatus.Habilitada, resultB.Status);
        Assert.Empty(resultB.MissingPrerequisites);
    }

    [Fact]
    public void EvaluateEligibility_ShouldEnableSubject_WhenRequirementIsRequiereRegularizada_AndPredecessorIsAprobada()
    {
        // Arrange
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "MAT1", "Matemática 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "MAT2", "Matemática 2", 1, 2);

        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id, PrerequisiteRequirementType.RequiereRegularizada)
        };

        var statuses = new Dictionary<Guid, SubjectStatus>
        {
            [subA.Id] = SubjectStatus.Aprobada
        };

        // Act
        var results = _engine.EvaluateEligibility(new[] { subA, subB }, prereqs, statuses);

        // Assert
        var resultB = results.First(r => r.SubjectId == subB.Id);
        Assert.Equal(CurriculumSubjectStatus.Habilitada, resultB.Status);
        Assert.Empty(resultB.MissingPrerequisites);
    }

    [Fact]
    public void EvaluateEligibility_ShouldBlockSubject_WhenRequirementIsRequiereAprobada_AndPredecessorIsOnlyRegularizada()
    {
        // Arrange
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "MAT1", "Matemática 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "MAT2", "Matemática 2", 1, 2);

        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id, PrerequisiteRequirementType.RequiereAprobada)
        };

        var statuses = new Dictionary<Guid, SubjectStatus>
        {
            [subA.Id] = SubjectStatus.Regularizada
        };

        // Act
        var results = _engine.EvaluateEligibility(new[] { subA, subB }, prereqs, statuses);

        // Assert
        var resultB = results.First(r => r.SubjectId == subB.Id);
        Assert.Equal(CurriculumSubjectStatus.Bloqueada, resultB.Status);
        Assert.Single(resultB.MissingPrerequisites);
        var missing = resultB.MissingPrerequisites[0];
        Assert.Equal(subA.Id, missing.RequiredSubjectId);
        Assert.Equal(PrerequisiteRequirementType.RequiereAprobada, missing.RequirementType);
        Assert.Equal(SubjectStatus.Regularizada, missing.CurrentStatus);
    }

    [Fact]
    public void EvaluateEligibility_ShouldEnableSubject_WhenRequirementIsRequiereAprobada_AndPredecessorIsAprobada()
    {
        // Arrange
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "MAT1", "Matemática 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "MAT2", "Matemática 2", 1, 2);

        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id, PrerequisiteRequirementType.RequiereAprobada)
        };

        var statuses = new Dictionary<Guid, SubjectStatus>
        {
            [subA.Id] = SubjectStatus.Aprobada
        };

        // Act
        var results = _engine.EvaluateEligibility(new[] { subA, subB }, prereqs, statuses);

        // Assert
        var resultB = results.First(r => r.SubjectId == subB.Id);
        Assert.Equal(CurriculumSubjectStatus.Habilitada, resultB.Status);
        Assert.Empty(resultB.MissingPrerequisites);
    }

    [Fact]
    public void EvaluateEligibility_ShouldAccumulateMultipleMissingPrerequisites()
    {
        // Arrange: D requiere A, B y C. Alumno aprobó C, pero A está solo regularizada y B no fue cursada.
        var plan = CreateTestPlan();
        var subA = CreateSubject(plan.Id, plan.UserId, "REQ_A", "Requerida A", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "REQ_B", "Requerida B", 1, 1);
        var subC = CreateSubject(plan.Id, plan.UserId, "REQ_C", "Requerida C", 1, 1);
        var subD = CreateSubject(plan.Id, plan.UserId, "TARGET_D", "Objetivo D", 1, 2);

        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subA.Id, PrerequisiteRequirementType.RequiereAprobada),
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subB.Id, PrerequisiteRequirementType.RequiereRegularizada),
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subC.Id, PrerequisiteRequirementType.RequiereRegularizada)
        };

        var statuses = new Dictionary<Guid, SubjectStatus>
        {
            [subA.Id] = SubjectStatus.Regularizada, // Insuficiente (requiere aprobada)
            // subB no existe en statuses -> Pendiente (insuficiente)
            [subC.Id] = SubjectStatus.Aprobada     // Satisfecha
        };

        // Act
        var results = _engine.EvaluateEligibility(new[] { subA, subB, subC, subD }, prereqs, statuses);

        // Assert
        var resultD = results.First(r => r.SubjectId == subD.Id);
        Assert.Equal(CurriculumSubjectStatus.Bloqueada, resultD.Status);
        Assert.Equal(2, resultD.MissingPrerequisites.Count);
        Assert.Contains(resultD.MissingPrerequisites, m => m.RequiredSubjectId == subA.Id && m.RequirementType == PrerequisiteRequirementType.RequiereAprobada);
        Assert.Contains(resultD.MissingPrerequisites, m => m.RequiredSubjectId == subB.Id && m.RequirementType == PrerequisiteRequirementType.RequiereRegularizada);
    }

    #endregion

    #region TSK-CP17: Pruebas de Camino Crítico, Scoring y Cupo de Cursada

    [Fact]
    public void GenerateNextTermRecommendations_ShouldPrioritizeCriticalPathAndFanOut()
    {
        // Arrange
        var plan = CreateTestPlan();
        // Troncal de 5 materias secuenciales: A -> B -> C -> D -> E
        var subA = CreateSubject(plan.Id, plan.UserId, "TRONCAL_1", "Troncal 1", 1, 1);
        var subB = CreateSubject(plan.Id, plan.UserId, "TRONCAL_2", "Troncal 2", 1, 2);
        var subC = CreateSubject(plan.Id, plan.UserId, "TRONCAL_3", "Troncal 3", 2, 1);
        var subD = CreateSubject(plan.Id, plan.UserId, "TRONCAL_4", "Troncal 4", 2, 2);
        var subE = CreateSubject(plan.Id, plan.UserId, "TRONCAL_5", "Troncal 5", 3, 1);
        // Materia electiva terminal aislada sin correlativas posteriores
        var subElective = CreateSubject(plan.Id, plan.UserId, "ELEC_TERM", "Electiva Terminal", 1, 1, isOptional: true);

        plan.AddSubject(subA);
        plan.AddSubject(subB);
        plan.AddSubject(subC);
        plan.AddSubject(subD);
        plan.AddSubject(subE);
        plan.AddSubject(subElective);

        var prereqs = new[]
        {
            CreatePrerequisite(plan.Id, plan.UserId, subB.Id, subA.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subC.Id, subB.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subD.Id, subC.Id),
            CreatePrerequisite(plan.Id, plan.UserId, subE.Id, subD.Id)
        };

        var statuses = new Dictionary<Guid, SubjectStatus>(); // Sin materias cursadas

        // Act
        var result = _engine.GenerateNextTermRecommendations(plan, prereqs, statuses, quotaLimit: 2);

        // Assert
        Assert.NotEmpty(result.Recommendations);
        var recTroncal = result.Recommendations.First(r => r.SubjectId == subA.Id);
        var recElective = result.Recommendations.FirstOrDefault(r => r.SubjectId == subElective.Id)
            ?? result.OtherEligibleSubjects.First(r => r.SubjectId == subElective.Id);

        // subA debe tener mayor prioridad y badge "Camino Crítico"
        Assert.True(recTroncal.PriorityScore > recElective.PriorityScore);
        Assert.Equal("Camino Crítico", recTroncal.RecommendationBadge);
        Assert.Equal(5, recTroncal.CriticalPathDepth);
        Assert.Equal(4, recTroncal.UnlockedFutureSubjectsCount);

        // Electiva terminal
        Assert.Equal("Materia Terminal", recElective.RecommendationBadge);
        Assert.Equal(1, recElective.CriticalPathDepth);
        Assert.Equal(0, recElective.UnlockedFutureSubjectsCount);
    }

    [Fact]
    public void GenerateNextTermRecommendations_ShouldRespectQuotaLimit()
    {
        // Arrange: 7 materias de 1er año todas habilitadas sin correlativas
        var plan = CreateTestPlan();
        var subjects = Enumerable.Range(1, 7)
            .Select(i => CreateSubject(plan.Id, plan.UserId, $"MAT_{i}", $"Materia {i}", 1, 1))
            .ToList();

        foreach (var s in subjects)
        {
            plan.AddSubject(s);
        }

        var prereqs = Array.Empty<CurriculumPrerequisite>();
        var statuses = new Dictionary<Guid, SubjectStatus>();

        // Act: Cupo de 4 materias
        var result = _engine.GenerateNextTermRecommendations(plan, prereqs, statuses, quotaLimit: 4);

        // Assert
        Assert.Equal(7, result.TotalEligibleSubjects);
        Assert.Equal(4, result.SuggestedQuota);
        Assert.Equal(4, result.Recommendations.Count);
        Assert.Equal(3, result.OtherEligibleSubjects.Count);
        Assert.Empty(result.BlockedSubjects);
    }

    [Fact]
    public void GenerateNextTermRecommendations_ShouldBoostDelayedSubjects()
    {
        // Arrange: Materia de 1er año pendiente y materia de 3er año habilitada
        var plan = CreateTestPlan();
        var subDelayed = CreateSubject(plan.Id, plan.UserId, "BASICA_1", "Básica 1° Año", 1, 1);
        var subCur3A = CreateSubject(plan.Id, plan.UserId, "AVANZADA_3A", "Avanzada 3° Año A", 3, 1);
        var subCur3B = CreateSubject(plan.Id, plan.UserId, "AVANZADA_3B", "Avanzada 3° Año B", 3, 1);

        plan.AddSubject(subDelayed);
        plan.AddSubject(subCur3A);
        plan.AddSubject(subCur3B);

        var prereqs = Array.Empty<CurriculumPrerequisite>();

        // El alumno actualmente está cursando una materia de 3er año
        var statuses = new Dictionary<Guid, SubjectStatus>
        {
            [subCur3A.Id] = SubjectStatus.EnCurso // Alumno se encuentra cursando 3° año
        };

        // Act
        var result = _engine.GenerateNextTermRecommendations(plan, prereqs, statuses, quotaLimit: 2);

        // Assert
        var recDelayed = result.Recommendations.First(r => r.SubjectId == subDelayed.Id);
        Assert.Equal("Troncal Pendiente", recDelayed.RecommendationBadge);
        Assert.Contains("1° año postergada", recDelayed.Justification);
    }

    #endregion

    #region TSK-CP18: Pruebas de Invariantes de Entidades de Dominio

    [Fact]
    public void CurriculumPrerequisite_ShouldThrow_WhenSelfReferenced()
    {
        // Arrange
        var planId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var subjectId = Guid.NewGuid();

        // Act & Assert
        var ex = Assert.Throws<InvalidOperationException>(() =>
            new CurriculumPrerequisite(planId, userId, subjectId, subjectId, PrerequisiteRequirementType.RequiereRegularizada));

        Assert.Contains("a sí misma como correlativa", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    [InlineData(-1)]
    public void CurriculumSubject_ShouldThrow_WhenYearLevelOutOfRange(int invalidYear)
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CurriculumSubject(Guid.NewGuid(), Guid.NewGuid(), "Materia Inválida", invalidYear, 1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    [InlineData(-2)]
    public void CurriculumSubject_ShouldThrow_WhenPeriodNumberOutOfRange(int invalidPeriod)
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new CurriculumSubject(Guid.NewGuid(), Guid.NewGuid(), "Materia Inválida", 1, invalidPeriod));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void CurriculumSubject_ShouldThrow_WhenNameIsInvalid(string? invalidName)
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentException>(() =>
            new CurriculumSubject(Guid.NewGuid(), Guid.NewGuid(), invalidName!, 1, 1));
    }

    [Fact]
    public void CurriculumSubject_Update_ShouldThrow_WhenParametersInvalid()
    {
        // Arrange
        var subject = new CurriculumSubject(Guid.NewGuid(), Guid.NewGuid(), "Química", 1, 1);

        // Act & Assert
        Assert.Throws<ArgumentException>(() =>
            subject.Update("", "QUIM", 1, 1, null, false, 0));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            subject.Update("Química", "QUIM", 12, 1, null, false, 0));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            subject.Update("Química", "QUIM", 1, 6, null, false, 0));
    }

    [Fact]
    public void CareerPlan_ShouldThrow_WhenUserIdOrNameEmpty()
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentException>(() =>
            new CareerPlan(Guid.Empty, "Ingeniería"));

        Assert.Throws<ArgumentException>(() =>
            new CareerPlan(Guid.NewGuid(), "   "));

        var plan = new CareerPlan(Guid.NewGuid(), "Licenciatura en Sistemas");
        Assert.Throws<ArgumentException>(() =>
            plan.UpdateDetails("  ", null, null));
    }

    [Fact]
    public void CareerPlan_SetActive_AndUpdateSubjectsCount_ShouldUpdateProperties()
    {
        // Arrange
        var plan = new CareerPlan(Guid.NewGuid(), "Abogacía", "UBA", 60, false);

        // Act
        plan.SetActive(true);
        plan.UpdateTotalSubjectsCount(42);

        // Assert
        Assert.True(plan.IsActive);
        Assert.Equal(42, plan.TotalSubjects);
    }

    [Fact]
    public void AcademicSubject_LinkCurriculumSubject_ShouldSetPropertyAndRefreshUpdatedAt()
    {
        // Arrange
        var academicSubject = new AcademicSubject(Guid.NewGuid(), "Álgebra", "2026-1C");
        var curriculumId = Guid.NewGuid();

        // Act
        academicSubject.LinkCurriculumSubject(curriculumId);

        // Assert
        Assert.Equal(curriculumId, academicSubject.CurriculumSubjectId);
    }

    #endregion
}
