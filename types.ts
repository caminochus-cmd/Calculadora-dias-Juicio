
export interface Holiday {
  date: Date;
  description?: string;
}

export interface CalculationResult {
  limitDate: Date;
  businessDaysTrack: Date[];
  isWeekend: boolean;
  isCustomHoliday: boolean;
}

export enum CalculationMode {
  STANDARD = 'standard',
  PRORROGADO = 'prorrogado'
}
