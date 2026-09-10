using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using LifeTracker.Application.Academics.Dtos;
using LifeTracker.Application.Academics.Services;
using LifeTracker.Application.Common.Interfaces;
using LifeTracker.Domain.Academics;
using LifeTracker.Infrastructure.Persistence;
using Xunit;

namespace LifeTracker.Domain.Tests;

public class CareerPlanServiceTests
{
    private readonly Guid _userId = Guid.NewGuid();

    private LifeTrackerDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LifeTrackerDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new LifeTrackerDbContext(options);
    }

    private class MockAiExtractor : IAiCareerPlanExtractor
    {
        public int CallCount { get; private set; }

        public Task<CareerPlanDraftDto> ExtractCurriculumPlanAsync(Stream fileStream, string mimeType, CancellationToken ct = default)
        {
            CallCount++;
            return Task.FromResult(new CareerPlanDraftDto(
                "Ingeniería Informática Demo",
                "UTN",
                120,
                new List<ExtractedSubjectDraftDto>
                {
                    new("S1", "AM1", "Análisis Matemático I", 1, 1, 5, false, new List<ExtractedPrerequisiteDraftDto>()),
                    new("S2", "AM2", "Análisis Matemático II", 2, 1, 5, false, new List<ExtractedPrerequisiteDraftDto>
                    {
                        new("AM1", "requiere_regularizada")
                    })
                },
                0.95,
                new List<string>()
            ));
        }

        public Task<CareerPlanDraftDto> ExtractDraftFromDocumentAsync(Stream documentStream, string mimeType, CancellationToken cancellationToken = default)
            => ExtractCurriculumPlanAsync(documentStream, mimeType, cancellationToken);
    }

    [Fact]
    public async Task ExtractDraftFromDocumentAsync_ShouldDelegateToAiExtractor_WithoutPersistingToDatabase()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        using var memoryStream = new MemoryStream(new byte[] { 1, 2, 3 });
        var draft = await service.ExtractDraftFromDocumentAsync(memoryStream, "application/pdf");

        Assert.NotNull(draft);
        Assert.Equal(1, mockExtractor.CallCount);
        Assert.Equal("Ingeniería Informática Demo", draft.SuggestedPlanName);
        Assert.Equal(2, draft.Subjects.Count);

        // Invariante HITL: 0 registros en base de datos
        Assert.Equal(0, await context.CareerPlans.CountAsync());
        Assert.Equal(0, await context.CurriculumSubjects.CountAsync());
        Assert.Equal(0, await context.CurriculumPrerequisites.CountAsync());
    }

    [Fact]
    public async Task CreatePlanAsync_ShouldThrowInvalidOperationException_WhenDirectCycleExists()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        var request = new CreateCareerPlanRequest(
            "Plan con Ciclo Directo",
            "Universidad",
            100,
            false,
            new List<CreateCurriculumSubjectRequest>
            {
                new("M1", "A", "Materia A", 1, 1, 4, false, 1, new List<CreateCurriculumPrerequisiteRequest>
                {
                    new("B", "requiere_regularizada")
                }),
                new("M2", "B", "Materia B", 1, 2, 4, false, 2, new List<CreateCurriculumPrerequisiteRequest>
                {
                    new("A", "requiere_regularizada")
                })
            }
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreatePlanAsync(_userId, request));

        Assert.Contains("circular", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(0, await context.CareerPlans.CountAsync());
    }

    [Fact]
    public async Task CreatePlanAsync_ShouldSucceed_AndActivateFirstPlanAutomatically()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        var request = new CreateCareerPlanRequest(
            "Ingeniería en Sistemas",
            "UTN",
            120,
            false, // Enviamos false pero al ser el primero debe quedar activo
            new List<CreateCurriculumSubjectRequest>
            {
                new("M1", "AM1", "Análisis Matemático I", 1, 1, 5, false, 1, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M2", "AGA", "Álgebra y Geometría Analítica", 1, 1, 4, false, 2, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M3", "AM2", "Análisis Matemático II", 2, 1, 5, false, 3, new List<CreateCurriculumPrerequisiteRequest>
                {
                    new("AM1", "requiere_regularizada"),
                    new("AGA", "requiere_regularizada")
                })
            }
        );

        var created = await service.CreatePlanAsync(_userId, request);

        Assert.NotNull(created);
        Assert.True(created.IsActive); // Activado automáticamente
        Assert.Equal(3, created.TotalSubjects);

        var dbPlan = await context.CareerPlans.Include(p => p.Subjects).FirstOrDefaultAsync(p => p.Id == created.Id);
        Assert.NotNull(dbPlan);
        Assert.True(dbPlan.IsActive);
        Assert.Equal(3, await context.CurriculumSubjects.CountAsync(s => s.CareerPlanId == created.Id));
        Assert.Equal(2, await context.CurriculumPrerequisites.CountAsync(p => p.CareerPlanId == created.Id));
    }

    [Fact]
    public async Task CreatePlanAsync_ShouldAtomicallyDeactivatePreviousActivePlan_WhenNewPlanIsActive()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        var request1 = new CreateCareerPlanRequest(
            "Plan 2015", "Universidad", 100, true,
            new List<CreateCurriculumSubjectRequest>
            {
                new("M1", "MAT1", "Materia 1", 1, 1, 4, false, 1, new List<CreateCurriculumPrerequisiteRequest>())
            }
        );

        var plan1 = await service.CreatePlanAsync(_userId, request1);
        Assert.True(plan1.IsActive);

        var request2 = new CreateCareerPlanRequest(
            "Plan 2023", "Universidad", 100, true,
            new List<CreateCurriculumSubjectRequest>
            {
                new("M2", "MAT2", "Materia 2", 1, 1, 4, false, 1, new List<CreateCurriculumPrerequisiteRequest>())
            }
        );

        var plan2 = await service.CreatePlanAsync(_userId, request2);
        Assert.True(plan2.IsActive);

        var reloadedPlan1 = await context.CareerPlans.FindAsync(plan1.Id);
        var reloadedPlan2 = await context.CareerPlans.FindAsync(plan2.Id);

        Assert.False(reloadedPlan1!.IsActive);
        Assert.True(reloadedPlan2!.IsActive);
    }

    [Fact]
    public async Task SetActivePlanAsync_ShouldSwitchActivePlanExclusively()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        var p1 = new CareerPlan(_userId, "Plan A", null, null, true);
        var p2 = new CareerPlan(_userId, "Plan B", null, null, false);
        context.CareerPlans.AddRange(p1, p2);
        await context.SaveChangesAsync();

        var switched = await service.SetActivePlanAsync(_userId, p2.Id);

        Assert.True(switched);
        var updatedP1 = await context.CareerPlans.FindAsync(p1.Id);
        var updatedP2 = await context.CareerPlans.FindAsync(p2.Id);

        Assert.False(updatedP1!.IsActive);
        Assert.True(updatedP2!.IsActive);
    }

    [Fact]
    public async Task GetPlanDetailAsync_ShouldComputeEligibilityAndPrerequisitesCorrectly()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        // Crear plan con 2 materias correlativas
        var request = new CreateCareerPlanRequest(
            "Plan Detalle", "UTN", 100, true,
            new List<CreateCurriculumSubjectRequest>
            {
                new("M1", "AM1", "Análisis Matemático I", 1, 1, 5, false, 1, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M2", "AM2", "Análisis Matemático II", 2, 1, 5, false, 2, new List<CreateCurriculumPrerequisiteRequest>
                {
                    new("AM1", "requiere_aprobada")
                })
            }
        );

        var plan = await service.CreatePlanAsync(_userId, request);
        var subjects = await context.CurriculumSubjects.Where(s => s.CareerPlanId == plan.Id).ToListAsync();
        var am1 = subjects.First(s => s.Code == "AM1");
        var am2 = subjects.First(s => s.Code == "AM2");

        // Estado inicial sin materias cursadas: AM1 habilitada, AM2 bloqueada
        var detail1 = await service.GetPlanDetailAsync(_userId, plan.Id);
        Assert.NotNull(detail1);
        Assert.Equal("habilitada", detail1.Subjects.First(s => s.Id == am1.Id).Status);
        Assert.Equal("bloqueada", detail1.Subjects.First(s => s.Id == am2.Id).Status);
        Assert.False(detail1.Subjects.First(s => s.Id == am2.Id).Prerequisites[0].IsSatisfied);

        // Alumno aprueba AM1
        var academicAm1 = new AcademicSubject(_userId, "Análisis Matemático I", "2026-1C", "AM1", null, SubjectStatus.Aprobada);
        academicAm1.LinkCurriculumSubject(am1.Id);
        context.AcademicSubjects.Add(academicAm1);
        await context.SaveChangesAsync();

        // Ahora AM1 debe estar 'aprobada' y AM2 'habilitada'
        var detail2 = await service.GetPlanDetailAsync(_userId, plan.Id);
        Assert.NotNull(detail2);
        Assert.Equal("aprobada", detail2.Subjects.First(s => s.Id == am1.Id).Status);
        Assert.Equal("habilitada", detail2.Subjects.First(s => s.Id == am2.Id).Status);
        Assert.True(detail2.Subjects.First(s => s.Id == am2.Id).Prerequisites[0].IsSatisfied);
        Assert.Equal(50.0, detail2.ProgressPercentage);
    }

    [Fact]
    public async Task GetRecommendationsAsync_ShouldReturnSuggestionsWithinQuota()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        var request = new CreateCareerPlanRequest(
            "Plan Recs", "UTN", 100, true,
            new List<CreateCurriculumSubjectRequest>
            {
                new("M1", "S1", "Materia 1", 1, 1, 4, false, 1, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M2", "S2", "Materia 2", 1, 1, 4, false, 2, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M3", "S3", "Materia 3", 1, 1, 4, false, 3, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M4", "S4", "Materia 4", 1, 1, 4, false, 4, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M5", "S5", "Materia 5", 1, 1, 4, false, 5, new List<CreateCurriculumPrerequisiteRequest>())
            }
        );

        var plan = await service.CreatePlanAsync(_userId, request);

        var recResult = await service.GetRecommendationsAsync(_userId, plan.Id, quota: 3);

        Assert.NotNull(recResult);
        Assert.Equal(5, recResult.TotalEligibleSubjects);
        Assert.Equal(3, recResult.Recommendations.Count);
        Assert.Equal(2, recResult.OtherEligibleSubjects.Count);
    }

    [Fact]
    public async Task EnrollSuggestedSubjectsAsync_ShouldCreateAcademicSubjectsLinked()
    {
        using var context = CreateDbContext();
        var mockExtractor = new MockAiExtractor();
        var engine = new CareerPrerequisiteEngine();
        var service = new CareerPlanService(context, engine, mockExtractor, NullLogger<CareerPlanService>.Instance);

        var request = new CreateCareerPlanRequest(
            "Plan Inscripción", "UTN", 100, true,
            new List<CreateCurriculumSubjectRequest>
            {
                new("M1", "S1", "Sistemas 1", 1, 1, 4, false, 1, new List<CreateCurriculumPrerequisiteRequest>()),
                new("M2", "S2", "Sistemas 2", 1, 1, 4, false, 2, new List<CreateCurriculumPrerequisiteRequest>())
            }
        );

        var plan = await service.CreatePlanAsync(_userId, request);
        var subjects = await context.CurriculumSubjects.Where(s => s.CareerPlanId == plan.Id).ToListAsync();

        var enrollRequest = new EnrollSuggestedSubjectsRequest(
            "2026-2C",
            subjects.Select(s => s.Id).ToList()
        );

        var enrolled = await service.EnrollSuggestedSubjectsAsync(_userId, plan.Id, enrollRequest);

        Assert.Equal(2, enrolled.Count);
        Assert.All(enrolled, s => Assert.Equal("2026-2C", s.Term));

        var dbSubjects = await context.AcademicSubjects.Where(s => s.UserId == _userId).ToListAsync();
        Assert.Equal(2, dbSubjects.Count);
        Assert.All(dbSubjects, s => Assert.NotNull(s.CurriculumSubjectId));
    }
}
