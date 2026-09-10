-- ==============================================================================
-- FASE 7: ENTRENAMIENTOS Y ACTIVIDAD FÍSICA (FITNESS)
-- Migration: 20260912000000_fitness_schema.sql
-- ==============================================================================

-- 1. ACTUALIZAR RESTRICCIÓN CHECK EN TIMELINE_ITEMS PARA SOPORTAR 'fitness'
ALTER TABLE public.timeline_items DROP CONSTRAINT IF EXISTS timeline_items_source_module_check;
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_source_module_check 
    CHECK (source_module IN ('health', 'habits', 'academics', 'work', 'notes', 'system', 'finances', 'fitness'));

-- ==============================================================================
-- 2. CATÁLOGO DE EJERCICIOS (public.exercises)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL para catálogo oficial del sistema
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    discipline TEXT NOT NULL CHECK (discipline IN ('strength', 'cardio', 'calisthenics', 'mobility')),
    primary_muscle_group TEXT NOT NULL CHECK (primary_muscle_group IN (
        'chest', 'upper_chest', 'lats', 'rhomboids', 'traps', 'lower_back',
        'anterior_deltoid', 'lateral_deltoid', 'posterior_deltoid',
        'biceps', 'triceps', 'forearms', 'quadriceps', 'hamstrings',
        'glutes', 'calves', 'abs', 'obliques'
    )),
    muscle_stimulus JSONB NOT NULL DEFAULT '[]'::jsonb,
    equipment TEXT NOT NULL CHECK (equipment IN (
        'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'smith_machine', 'bands', 'other'
    )),
    instructions TEXT[] DEFAULT '{}'::text[] NOT NULL,
    gif_url TEXT NOT NULL DEFAULT '',
    video_url TEXT,
    is_custom BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_custom_exercise_owner CHECK (
        (is_custom = false AND user_id IS NULL) OR
        (is_custom = true AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_exercises_user_system ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON public.exercises(primary_muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_discipline ON public.exercises(discipline);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_user_slug ON public.exercises(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_read_all" ON public.exercises;
CREATE POLICY "exercises_read_all" ON public.exercises 
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "exercises_insert_own" ON public.exercises;
CREATE POLICY "exercises_insert_own" ON public.exercises 
    FOR INSERT WITH CHECK (auth.uid() = user_id AND is_custom = true);

DROP POLICY IF EXISTS "exercises_update_own" ON public.exercises;
CREATE POLICY "exercises_update_own" ON public.exercises 
    FOR UPDATE USING (auth.uid() = user_id AND is_custom = true);

DROP POLICY IF EXISTS "exercises_delete_own" ON public.exercises;
CREATE POLICY "exercises_delete_own" ON public.exercises 
    FOR DELETE USING (auth.uid() = user_id AND is_custom = true);

-- ==============================================================================
-- 3. PLANTILLAS DE RUTINAS (public.routines y public.routine_exercises)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    estimated_duration_minutes INT DEFAULT 60 NOT NULL CHECK (estimated_duration_minutes > 0),
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routines_user ON public.routines(user_id);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "routines_all_own" ON public.routines;
CREATE POLICY "routines_all_own" ON public.routines FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.routine_exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE RESTRICT NOT NULL,
    order_index INT NOT NULL CHECK (order_index >= 0),
    target_sets INT NOT NULL CHECK (target_sets > 0),
    target_reps_min INT NOT NULL CHECK (target_reps_min > 0),
    target_reps_max INT NOT NULL CHECK (target_reps_max >= target_reps_min),
    rest_timer_seconds INT DEFAULT 90 NOT NULL CHECK (rest_timer_seconds >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (routine_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON public.routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise ON public.routine_exercises(exercise_id);

ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "routine_exercises_all_own" ON public.routine_exercises;
CREATE POLICY "routine_exercises_all_own" ON public.routine_exercises 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.routines r 
            WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 4. SESIONES DE ENTRENAMIENTO (public.workout_sessions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'discarded')),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0 NOT NULL CHECK (duration_seconds >= 0),
    total_volume_kg NUMERIC(12,2) DEFAULT 0.00 NOT NULL CHECK (total_volume_kg >= 0),
    total_sets_completed INT DEFAULT 0 NOT NULL CHECK (total_sets_completed >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invariante 9: Unicidad estricta de sesión activa por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_single_active 
    ON public.workout_sessions(user_id) 
    WHERE (status = 'active');

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_status ON public.workout_sessions(user_id, status, started_at DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workout_sessions_all_own" ON public.workout_sessions;
CREATE POLICY "workout_sessions_all_own" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. SERIES DE ENTRENAMIENTO (public.workout_sets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE RESTRICT NOT NULL,
    set_order INT NOT NULL CHECK (set_order >= 0),
    set_type TEXT NOT NULL CHECK (set_type IN ('normal', 'warmup', 'drop_set', 'failure')),
    weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 0),
    reps INT NOT NULL CHECK (reps >= 0),
    rpe NUMERIC(3,1) CHECK (rpe IS NULL OR (rpe >= 1.0 AND rpe <= 10.0)),
    rir INT CHECK (rir IS NULL OR (rir >= 0 AND rir <= 10)),
    is_completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_session ON public.workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_completed ON public.workout_sets(exercise_id, is_completed);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workout_sets_all_own" ON public.workout_sets;
CREATE POLICY "workout_sets_all_own" ON public.workout_sets 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions s 
            WHERE s.id = workout_sets.session_id AND s.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 6. PRE-SEMBRADO DEL CATÁLOGO INICIAL DE EJERCICIOS (SEED DATA)
-- ==============================================================================
INSERT INTO public.exercises (name, slug, discipline, primary_muscle_group, muscle_stimulus, equipment, instructions, gif_url, is_custom)
VALUES
(
    'Press de Banca Plano con Barra',
    'press-de-banca-plano-con-barra',
    'strength',
    'chest',
    '[{"muscle":"chest","stimulus_pct":100},{"muscle":"triceps","stimulus_pct":60},{"muscle":"anterior_deltoid","stimulus_pct":40}]'::jsonb,
    'barbell',
    ARRAY[
        'Acuéstate sobre el banco plano con los ojos directamente debajo de la barra.',
        'Retrae y deprime las escápulas clavándolas en el banco, manteniendo un arco lumbar natural.',
        'Agarra la barra con una separación ligeramente superior al ancho de hombros.',
        'Baja la barra de forma controlada hacia la parte media/baja del esternón manteniendo los codos a unos 45-70 grados del torso.',
        'Empuja con fuerza clavando los talones contra el suelo (leg drive) hasta extender los brazos sin perder la retracción escapular.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
    false
),
(
    'Press Inclinado con Mancuernas',
    'press-inclinado-con-mancuernas',
    'strength',
    'upper_chest',
    '[{"muscle":"upper_chest","stimulus_pct":100},{"muscle":"anterior_deltoid","stimulus_pct":60},{"muscle":"triceps","stimulus_pct":50}]'::jsonb,
    'dumbbell',
    ARRAY[
        'Ajusta el banco a una inclinación de 30 a 45 grados.',
        'Lleva las mancuernas a los hombros con ayuda de las rodillas y retrae las escápulas.',
        'Empuja las mancuernas verticalmente convergiendo ligeramente arriba sin chocarlas.',
        'Desciende controlando el movimiento sintiendo el estiramiento en la porción clavicular del pectoral.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg',
    false
),
(
    'Aperturas en Polea (Crossover)',
    'aperturas-en-polea',
    'strength',
    'chest',
    '[{"muscle":"chest","stimulus_pct":100},{"muscle":"anterior_deltoid","stimulus_pct":30}]'::jsonb,
    'cable',
    ARRAY[
        'Coloca las poleas a media altura o altas con un paso al frente para ganar estabilidad.',
        'Mantén una ligera flexión constante de codos durante todo el recorrido.',
        'Junta las manos al frente apretando el pecho fuertemente en contracción máxima por 1 segundo.',
        'Abre los brazos lentamente sintiendo la tensión continua que otorga el cable.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg',
    false
),
(
    'Sentadilla Trasera con Barra',
    'sentadilla-trasera-con-barra',
    'strength',
    'quadriceps',
    '[{"muscle":"quadriceps","stimulus_pct":100},{"muscle":"glutes","stimulus_pct":80},{"muscle":"lower_back","stimulus_pct":40},{"muscle":"calves","stimulus_pct":20}]'::jsonb,
    'barbell',
    ARRAY[
        'Coloca la barra sobre la parte superior de los trapecios o deltoides posterior.',
        'Pies al ancho de hombros con las puntas ligeramente orientadas hacia afuera (15-30 grados).',
        'Inhala profundo, expande el abdomen en 360 grados y realiza maniobra de Valsalva.',
        'Desciende flexionando simultáneamente caderas y rodillas manteniendo el pecho erguido.',
        'Alcanza profundidad paralela y empuja explosivamente contra el suelo.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg',
    false
),
(
    'Prensa de Piernas a 45 Grados',
    'prensa-de-piernas-a-45-grados',
    'strength',
    'quadriceps',
    '[{"muscle":"quadriceps","stimulus_pct":100},{"muscle":"glutes","stimulus_pct":60},{"muscle":"hamstrings","stimulus_pct":30}]'::jsonb,
    'machine',
    ARRAY[
        'Apoya la espalda baja y glúteos firmemente en el respaldo sin redondear la pelvis.',
        'Coloca los pies al ancho de hombros en el centro de la plataforma.',
        'Baja controlando el peso hasta alcanzar al menos 90 grados de flexión de rodilla.',
        'Extiende las piernas con fuerza sin bloquear bruscamente las rodillas al final.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg',
    false
),
(
    'Extensión de Cuádriceps en Máquina',
    'extension-de-cuadriceps-en-maquina',
    'strength',
    'quadriceps',
    '[{"muscle":"quadriceps","stimulus_pct":100}]'::jsonb,
    'machine',
    ARRAY[
        'Ajusta el respaldo para que el eje de rotación de la máquina coincida con tu rodilla.',
        'El rodillo debe apoyar justo por encima de los tobillos.',
        'Extiende las piernas hasta el bloqueo controlado y pausa 1 segundo en contracción máxima.',
        'Desciende resistiendo el peso en 2 o 3 segundos.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg',
    false
),
(
    'Peso Muerto Convencional con Barra',
    'peso-muerto-convencional-con-barra',
    'strength',
    'hamstrings',
    '[{"muscle":"hamstrings","stimulus_pct":100},{"muscle":"glutes","stimulus_pct":90},{"muscle":"lower_back","stimulus_pct":80},{"muscle":"traps","stimulus_pct":60},{"muscle":"forearms","stimulus_pct":50}]'::jsonb,
    'barbell',
    ARRAY[
        'Pies al ancho de caderas con la barra colocada sobre la mitad del empeine.',
        'Flexiona caderas manteniendo la espalda neutra hasta que las manos tomen la barra.',
        'Activa los dorsales imaginando doblar la barra contra las espinillas.',
        'Empuja el suelo con las piernas extendiendo caderas y rodillas al unísono.',
        'Bloquea arriba contrayendo glúteos sin arquear la columna hacia atrás.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg',
    false
),
(
    'Curl Femoral Tumbado en Máquina',
    'curl-femoral-tumbado',
    'strength',
    'hamstrings',
    '[{"muscle":"hamstrings","stimulus_pct":100},{"muscle":"calves","stimulus_pct":20}]'::jsonb,
    'machine',
    ARRAY[
        'Túmbate boca abajo con el rodillo apoyado en el tendón de Aquiles.',
        'Sujeta los manillares y mantén la pelvis pegada al banco.',
        'Flexiona las rodillas llevando los talones hacia los glúteos.',
        'Baja de forma lenta y controlada hasta estirar los isquiosurales.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg',
    false
),
(
    'Hip Thrust con Barra',
    'hip-thrust-con-barra',
    'strength',
    'glutes',
    '[{"muscle":"glutes","stimulus_pct":100},{"muscle":"hamstrings","stimulus_pct":40},{"muscle":"quadriceps","stimulus_pct":30}]'::jsonb,
    'barbell',
    ARRAY[
        'Apoya la parte inferior de las escápulas contra el borde del banco acolchado.',
        'Coloca la barra protegida sobre la pelvis y los pies al ancho de hombros.',
        'Empuja a través de los talones extendiendo la cadera hasta formar una línea recta torso-muslos.',
        'Aprieta los glúteos arriba durante 1 segundo manteniendo la barbilla pegada al pecho.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg',
    false
),
(
    'Dominadas Pronas (Pull-ups)',
    'dominadas-pronas',
    'calisthenics',
    'lats',
    '[{"muscle":"lats","stimulus_pct":100},{"muscle":"biceps","stimulus_pct":70},{"muscle":"rhomboids","stimulus_pct":60},{"muscle":"forearms","stimulus_pct":40}]'::jsonb,
    'bodyweight',
    ARRAY[
        'Sujeta la barra con agarre prono algo más ancho que los hombros.',
        'Inicia deprimiendo y retrayendo las escápulas activamente.',
        'Tracciona llevando los codos hacia las costillas hasta pasar la barbilla sobre la barra.',
        'Desciende con control absoluto hasta estirar completamente los brazos sin balanceo.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg',
    false
),
(
    'Jalón al Pecho en Polea Alta',
    'jalon-al-pecho-en-polea-alta',
    'strength',
    'lats',
    '[{"muscle":"lats","stimulus_pct":100},{"muscle":"biceps","stimulus_pct":60},{"muscle":"rhomboids","stimulus_pct":50}]'::jsonb,
    'cable',
    ARRAY[
        'Ajusta las almohadillas sobre los muslos para quedar firmemente anclado.',
        'Toma la barra ancha con agarre prono y reclina el torso apenas unos 10 grados.',
        'Tira de la barra hacia la parte superior del pecho dirigiendo los codos hacia abajo y atrás.',
        'Sube lentamente permitiendo que los dorsales se estiren por completo.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg',
    false
),
(
    'Remo con Barra Inclinado (Barbell Row)',
    'remo-con-barra-inclinado',
    'strength',
    'rhomboids',
    '[{"muscle":"rhomboids","stimulus_pct":100},{"muscle":"lats","stimulus_pct":80},{"muscle":"lower_back","stimulus_pct":60},{"muscle":"biceps","stimulus_pct":50},{"muscle":"posterior_deltoid","stimulus_pct":40}]'::jsonb,
    'barbell',
    ARRAY[
        'Flexiona caderas con la espalda neutra a unos 45 grados de inclinación.',
        'Agarra la barra con palmas hacia el cuerpo (prono) o hacia ti (supino).',
        'Tira de la barra hacia el ombligo apretando fuertemente las escápulas.',
        'Desciende el peso con control sin perder la posición de la columna lumbar.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg',
    false
),
(
    'Remo Gironda en Polea Baja',
    'remo-gironda-en-polea-baja',
    'strength',
    'rhomboids',
    '[{"muscle":"rhomboids","stimulus_pct":100},{"muscle":"lats","stimulus_pct":75},{"muscle":"biceps","stimulus_pct":45}]'::jsonb,
    'cable',
    ARRAY[
        'Siéntate con las rodillas ligeramente flexionadas y el torso erguido.',
        'Toma el agarre en V y retrae las escápulas antes de comenzar la tracción.',
        'Lleva el manillar al abdomen bajo sacando pecho y apretando la espalda media.',
        'Regresa a la posición inicial extendiendo los brazos sin redondear en exceso la espalda.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg',
    false
),
(
    'Press Militar con Barra de Pie',
    'press-militar-con-barra',
    'strength',
    'anterior_deltoid',
    '[{"muscle":"anterior_deltoid","stimulus_pct":100},{"muscle":"triceps","stimulus_pct":60},{"muscle":"lateral_deltoid","stimulus_pct":50},{"muscle":"traps","stimulus_pct":40},{"muscle":"abs","stimulus_pct":30}]'::jsonb,
    'barbell',
    ARRAY[
        'Apoya la barra sobre la clavícula con agarre al ancho de hombros.',
        'Activa glúteos y abdomen para mantener el tronco recto y estable.',
        'Empuja la barra en línea recta vertical inclinando sutilmente la cabeza hacia atrás al inicio.',
        'Pasa la cabeza hacia adelante al superar la altura de la frente y bloquea arriba.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Military_Press/0.jpg',
    false
),
(
    'Elevaciones Laterales con Mancuernas',
    'elevaciones-laterales-con-mancuernas',
    'strength',
    'lateral_deltoid',
    '[{"muscle":"lateral_deltoid","stimulus_pct":100},{"muscle":"traps","stimulus_pct":30},{"muscle":"anterior_deltoid","stimulus_pct":20}]'::jsonb,
    'dumbbell',
    ARRAY[
        'De pie con mancuernas a los costados y codos ligeramente flexionados.',
        'Eleva los brazos por el plano escapular hasta la altura de los hombros.',
        'Evita balancear el torso o impulsarte con las piernas.',
        'Baja resistiendo la gravedad durante 2 segundos.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg',
    false
),
(
    'Pájaros con Mancuernas (Deltoides Posterior)',
    'pajaros-con-mancuernas',
    'strength',
    'posterior_deltoid',
    '[{"muscle":"posterior_deltoid","stimulus_pct":100},{"muscle":"rhomboids","stimulus_pct":50},{"muscle":"traps","stimulus_pct":30}]'::jsonb,
    'dumbbell',
    ARRAY[
        'Inclina el torso hacia adelante hasta quedar casi paralelo al suelo.',
        'Eleva las mancuernas hacia los lados focalizando la tensión en la parte trasera del hombro.',
        'Mantén los codos en un ángulo fijo sin rotar las muñecas.',
        'Desciende lentamente manteniendo la inclinación del torso.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Bent-Over_Rear_Delt_Raise/0.jpg',
    false
),
(
    'Curl de Bíceps con Barra Z',
    'curl-de-biceps-con-barra-z',
    'strength',
    'biceps',
    '[{"muscle":"biceps","stimulus_pct":100},{"muscle":"forearms","stimulus_pct":40}]'::jsonb,
    'barbell',
    ARRAY[
        'Agarra la barra Z por sus ángulos ergonómicos con las palmas hacia arriba.',
        'Pega los codos a los lados del torso.',
        'Flexiona los codos contrayendo los bíceps sin echar los hombros hacia adelante.',
        'Baja de forma controlada hasta la extensión completa.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg',
    false
),
(
    'Curl Martillo con Mancuernas',
    'curl-martillo-con-mancuernas',
    'strength',
    'forearms',
    '[{"muscle":"forearms","stimulus_pct":100},{"muscle":"biceps","stimulus_pct":80}]'::jsonb,
    'dumbbell',
    ARRAY[
        'Sujeta las mancuernas con agarre neutro (palmas mirándose entre sí).',
        'Eleva las mancuernas manteniendo las muñecas firmes y rectas.',
        'Aprieta en la parte superior enfocando el braquial y braquiorradial.',
        'Desciende suavemente sin perder la orientación neutra del agarre.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg',
    false
),
(
    'Fondos en Paralelas (Dips)',
    'fondos-en-paralelas',
    'calisthenics',
    'triceps',
    '[{"muscle":"triceps","stimulus_pct":100},{"muscle":"chest","stimulus_pct":75},{"muscle":"anterior_deltoid","stimulus_pct":40}]'::jsonb,
    'bodyweight',
    ARRAY[
        'Suspéndete en las paralelas con brazos extendidos y hombros deprimidos.',
        'Flexiona los codos bajando hasta un ángulo de 90 grados.',
        'Empuja con fuerza extendiendo los brazos sin sacudidas bruscas.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/0.jpg',
    false
),
(
    'Extensión de Tríceps en Polea Alta con Cuerda',
    'extension-triceps-polea-cuerda',
    'strength',
    'triceps',
    '[{"muscle":"triceps","stimulus_pct":100}]'::jsonb,
    'cable',
    ARRAY[
        'Fija los codos a los lados de las costillas.',
        'Extiende los brazos hacia abajo separando los extremos de la cuerda al final.',
        'Aprieta los tríceps por 1 segundo en extensión completa.',
        'Regresa a 90 grados sin mover los codos de su posición.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_-_Rope_Attachment/0.jpg',
    false
),
(
    'Elevación de Talones en Máquina (Gemelos)',
    'elevacion-de-talones-en-maquina',
    'strength',
    'calves',
    '[{"muscle":"calves","stimulus_pct":100}]'::jsonb,
    'machine',
    ARRAY[
        'Apoya la punta de los pies en el escalón dejando los talones libres.',
        'Baja los talones lentamente sintiendo el estiramiento profundo del gemelo.',
        'Eleva los talones lo más alto posible contrayendo fuertemente arriba.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg',
    false
),
(
    'Elevación de Piernas Colgado (Hanging Leg Raise)',
    'elevacion-de-piernas-colgado',
    'calisthenics',
    'abs',
    '[{"muscle":"abs","stimulus_pct":100},{"muscle":"obliques","stimulus_pct":50},{"muscle":"forearms","stimulus_pct":30}]'::jsonb,
    'bodyweight',
    ARRAY[
        'Cuélgate de una barra con agarre prono firme.',
        'Eleva las piernas rectas o flexionadas curvando la pelvis hacia el pecho.',
        'Evita utilizar el impulso del balanceo del cuerpo.',
        'Baja las piernas lentamente manteniendo tensión en el core.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg',
    false
),
(
    'Plancha Abdominal Frontal',
    'plancha-abdominal-frontal',
    'mobility',
    'abs',
    '[{"muscle":"abs","stimulus_pct":100},{"muscle":"obliques","stimulus_pct":70},{"muscle":"lower_back","stimulus_pct":50}]'::jsonb,
    'bodyweight',
    ARRAY[
        'Apoya los antebrazos en el suelo alineados con los hombros.',
        'Mantén el cuerpo en línea recta desde la cabeza hasta los talones.',
        'Activa glúteos y contrae el abdomen empujando el suelo con los codos.',
        'Respira fluidamente sin dejar caer la pelvis ni elevarla en exceso.'
    ],
    'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg',
    false
)
ON CONFLICT (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), slug) DO NOTHING;
