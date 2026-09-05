const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export interface ExtractedClinicalValue {
  metricName: string;
  value: string;
  unit?: string;
  category?: string;
  isAbnormal: boolean;
}

export interface ExtractedStudyResult {
  fileUrl: string;
  fileName: string;
  studyType: string;
  studyDate: string;
  institution?: string;
  clinicalValues: ExtractedClinicalValue[];
}

export interface HealthStudy {
  id: string;
  userId: string;
  studyType: string;
  studyDate: string;
  fileUrl: string;
  institution?: string;
  summary?: string;
  createdAt: string;
  clinicalValues: {
    id: string;
    studyId: string;
    metricName: string;
    value: string;
    unit?: string;
    category?: string;
    isAbnormal: boolean;
  }[];
}

export interface MetricDataPoint {
  studyId: string;
  studyDate: string;
  year: number;
  studyType: string;
  institution?: string;
  value: string;
  numericValue?: number;
  unit?: string;
  isAbnormal: boolean;
}

export interface MetricComparison {
  metricName: string;
  unit?: string;
  history: MetricDataPoint[];
}

export class LifeTrackerApiClient {
  private static getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // 1. Extraer datos con Gemini y subir a R2
  static async extractStudy(file: File, token?: string): Promise<ExtractedStudyResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/api/health/extract`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al extraer estudio: ${res.statusText}`);
    }

    return res.json();
  }

  // 2. Guardar estudio confirmado
  static async saveStudy(studyData: {
    studyType: string;
    studyDate: string;
    fileUrl: string;
    institution?: string;
    summary?: string;
    clinicalValues: Array<{
      metricName: string;
      value: string;
      unit?: string;
      category?: string;
      isAbnormal?: boolean;
    }>;
  }, token?: string): Promise<HealthStudy> {
    const res = await fetch(`${API_BASE_URL}/api/health/studies`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studyData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al guardar el estudio médico.");
    }

    return res.json();
  }

  // 3. Listar estudios
  static async getStudies(year?: number, token?: string): Promise<HealthStudy[]> {
    const url = new URL(`${API_BASE_URL}/api/health/studies`);
    if (year) url.searchParams.set("year", year.toString());

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener los estudios médicos.");
    return res.json();
  }

  // 4. Comparación de métricas
  static async compareMetric(metricName: string, token?: string): Promise<MetricComparison> {
    const url = new URL(`${API_BASE_URL}/api/health/metrics/compare`);
    url.searchParams.set("name", metricName);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al consultar la comparativa de la métrica.");
    return res.json();
  }

  // 5. Lista de métricas disponibles
  static async getAvailableMetrics(token?: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/api/health/metrics`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener las métricas disponibles.");
    return res.json();
  }
}
