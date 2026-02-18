
import { addDays, subDays, isWeekend, isSameDay, startOfDay, format, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

export class CalculatorService {
  /**
   * Checks if a date is a holiday (weekend or custom holiday)
   */
  static isNonBusinessDay(date: Date, holidays: Date[]): boolean {
    if (isWeekend(date)) return true;
    return holidays.some(holiday => isSameDay(startOfDay(date), startOfDay(holiday)));
  }

  /**
   * Calculates the deadline based on Art 82.5 LRJS (10 business days before)
   * plus the "día de gracia" (Art 45 LRJS / 135 LEC) which is the next business day until 15:00
   */
  static calculateDeadline(trialDate: Date, holidays: Date[]) {
    let businessDaysFound = 0;
    let currentDate = subDays(trialDate, 1);
    const businessDaysTrack: Date[] = [];

    // 1. Find the 10th business day prior to the trial
    while (businessDaysFound < 10) {
      if (!this.isNonBusinessDay(currentDate, holidays)) {
        businessDaysFound++;
        businessDaysTrack.push(new Date(currentDate));
      }
      if (businessDaysFound < 10) {
        currentDate = subDays(currentDate, 1);
      }
    }

    // currentDate is now the 10th business day before the trial.
    // This is the theoretical deadline at 23:59.
    const theoreticalDeadline = new Date(currentDate);

    // 2. The "Prórroga" (Día de Gracia) is the next business day until 15:00h
    let prorrogueDate = addDays(theoreticalDeadline, 1);
    while (this.isNonBusinessDay(prorrogueDate, holidays)) {
      prorrogueDate = addDays(prorrogueDate, 1);
    }

    return {
      theoreticalDeadline,
      prorrogueDate,
      businessDaysTrack: businessDaysTrack.reverse()
    };
  }

  static parseHolidays(input: string): Date[] {
    return input
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^\d{4}-\d{2}-\d{2}$/.test(line))
      .map(line => startOfDay(new Date(line)));
  }
}
