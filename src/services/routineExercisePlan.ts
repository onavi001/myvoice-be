export type RoutineGoal = 'fuerza' | 'hipertrofia' | 'resistencia';
export type RoutineLevel = 'principiante' | 'intermedio' | 'avanzado';
export type RoutineEquipment = 'gym' | 'casa' | 'pesas';
export type BiologicalSex = 'masculino' | 'femenino';
export type BmiCategory = 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad';

export type SessionPlanInput = {
  sessionDurationMin: number;
  goal: RoutineGoal;
  level: RoutineLevel;
  equipment: RoutineEquipment;
  heightCm: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
};

export type SessionPlanResult = {
  exercisesPerDay: number;
  bmi: number;
  bmiCategory: BmiCategory;
  minutesPerExercise: number;
  planRationale: string;
};

const BMI_LABELS: Record<BmiCategory, string> = {
  bajo_peso: 'bajo peso',
  normal: 'normal',
  sobrepeso: 'sobrepeso',
  obesidad: 'obesidad',
};

export function computeBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'bajo_peso';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'sobrepeso';
  return 'obesidad';
}

function maxExercisesByDuration(sessionDurationMin: number): number {
  if (sessionDurationMin <= 30) return 3;
  if (sessionDurationMin <= 45) return 4;
  if (sessionDurationMin <= 60) return 5;
  if (sessionDurationMin <= 90) return 6;
  if (sessionDurationMin <= 120) return 7;
  return 8;
}

/**
 * Estima cuántos ejercicios caben en una sesión según perfil físico,
 * tiempo, objetivo, nivel y equipo.
 */
export function buildSessionExercisePlan(input: SessionPlanInput): SessionPlanResult {
  const bmi = computeBmi(input.heightCm, input.weightKg);
  const bmiCategory = getBmiCategory(bmi);

  let minutesPerExercise =
    input.goal === 'fuerza' ? 14 : input.goal === 'resistencia' ? 9 : 11;

  if (input.level === 'principiante') minutesPerExercise += 2;
  else if (input.level === 'avanzado') minutesPerExercise -= 1;

  if (input.equipment === 'casa') minutesPerExercise += 1.5;
  else if (input.equipment === 'pesas') minutesPerExercise += 0.5;

  if (bmiCategory === 'obesidad') minutesPerExercise += 2;
  else if (bmiCategory === 'sobrepeso') minutesPerExercise += 1;
  else if (bmiCategory === 'bajo_peso' && input.level === 'principiante') minutesPerExercise += 1;

  if (
    input.sessionDurationMin >= 90 &&
    input.goal !== 'fuerza' &&
    input.level !== 'principiante'
  ) {
    minutesPerExercise -= 1;
  }
  if (input.sessionDurationMin >= 150 && input.goal === 'resistencia') {
    minutesPerExercise -= 0.5;
  }

  let count = Math.round(input.sessionDurationMin / minutesPerExercise);

  if (input.goal === 'fuerza') {
    const fuerzaCap = input.level === 'principiante' ? 4 : input.level === 'intermedio' ? 5 : 6;
    count = Math.min(count, fuerzaCap);
    count = Math.max(count, 2);
  } else if (input.goal === 'resistencia') {
    const resistFloor = Math.max(3, Math.floor(input.sessionDurationMin / 28));
    count = Math.max(count, resistFloor);
    count = Math.min(count, 8);
  } else {
    const hypoFloor =
      input.level === 'principiante' ? 3 : input.sessionDurationMin >= 60 ? 4 : 3;
    count = Math.max(count, hypoFloor);
  }

  if (input.level === 'principiante') {
    const beginnerCap =
      input.sessionDurationMin <= 45 ? 3 : input.sessionDurationMin <= 75 ? 4 : 5;
    count = Math.min(count, beginnerCap);
  }

  count = Math.min(maxExercisesByDuration(input.sessionDurationMin), Math.max(2, count));

  const sexLabel = input.biologicalSex === 'femenino' ? 'femenino' : 'masculino';
  const planRationale =
    `IMC ${bmi} (${BMI_LABELS[bmiCategory]}), sexo biológico ${sexLabel}, ` +
    `${input.heightCm} cm / ${input.weightKg} kg, ${input.sessionDurationMin} min por sesión, ` +
    `objetivo ${input.goal}, nivel ${input.level}, equipo ${input.equipment}: ` +
    `~${minutesPerExercise.toFixed(1)} min por ejercicio → ${count} ejercicios por día.`;

  return {
    exercisesPerDay: count,
    bmi,
    bmiCategory,
    minutesPerExercise,
    planRationale,
  };
}
