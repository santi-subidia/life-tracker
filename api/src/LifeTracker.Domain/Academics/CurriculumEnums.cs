namespace LifeTracker.Domain.Academics;

/// <summary>
/// Define el tipo de exigencia de una correlativa en el régimen universitario.
/// </summary>
public enum PrerequisiteRequirementType
{
    /// <summary>
    /// Exige tener cursada aprobada / regularidad en la correlativa previa.
    /// </summary>
    RequiereRegularizada = 1,

    /// <summary>
    /// Exige tener examen final aprobado o promoción cerrada en la correlativa previa.
    /// </summary>
    RequiereAprobada = 2
}

/// <summary>
/// Estado calculado de una materia curricular en el contexto del progreso del estudiante.
/// </summary>
public enum CurriculumSubjectStatus
{
    Bloqueada,
    Habilitada,
    EnCurso,
    Regularizada,
    Aprobada
}
