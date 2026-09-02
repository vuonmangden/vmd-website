import { BadRequestException, Injectable } from '@nestjs/common';

export interface RateRule { id: string; dateFrom: Date; dateTo: Date; daysOfWeek: number[]; nightlyPrice: bigint; extraAdultPrice: bigint; extraChildPrice: bigint; minNights: number; maxNights: number | null; priority: number; status: string; rateType?: string; }
export interface NightlyPriceSnapshot { date: string; ruleId: string; rateType: 'STANDARD' | 'HOLIDAY'; baseAmount: bigint; extraMattressAmount: bigint; extraChildAmount: bigint; total: bigint; }
export interface PriceQuote { nightlySubtotal: bigint; extraGuestSubtotal: bigint; total: bigint; nights: number; appliedRuleIds: string[]; usesHolidayRate: boolean; nightlyBreakdown: NightlyPriceSnapshot[]; }

@Injectable()
export class PriceEngineService {
  quote(rules: RateRule[], dateFrom: string, dateTo: string, adults: number, children: number, includedAdults: number, extraMattressQuantity = 0): PriceQuote {
    const start = day(dateFrom); const end = day(dateTo); const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (nights < 1 || !Number.isInteger(adults) || !Number.isInteger(children) || !Number.isInteger(includedAdults) || !Number.isInteger(extraMattressQuantity) || adults < 1 || children < 0 || includedAdults < 1 || extraMattressQuantity < 0 || extraMattressQuantity > 1) throw invalidQuote();
    let nightlySubtotal = 0n; let extraGuestSubtotal = 0n; const appliedRuleIds: string[] = []; const nightlyBreakdown: NightlyPriceSnapshot[] = [];
    for (let index = 0; index < nights; index += 1) {
      const stayDate = new Date(start.getTime() + index * 86_400_000);
      const matching = rules.filter((rule) => rule.status === 'ACTIVE' && rule.dateFrom <= stayDate && rule.dateTo > stayDate && (rule.daysOfWeek.length === 0 || rule.daysOfWeek.includes(stayDate.getUTCDay()))).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
      const rule = matching[0];
      if (!rule || nights < rule.minNights || (rule.maxNights !== null && nights > rule.maxNights)) throw invalidQuote();
      const mattressCount = Math.max(extraMattressQuantity, Math.max(0, adults - includedAdults));
      const extraMattressAmount = BigInt(mattressCount) * rule.extraAdultPrice;
      const extraChildAmount = BigInt(children) * rule.extraChildPrice;
      nightlySubtotal += rule.nightlyPrice; extraGuestSubtotal += extraMattressAmount + extraChildAmount; appliedRuleIds.push(rule.id);
      nightlyBreakdown.push({ date: stayDate.toISOString().slice(0, 10), ruleId: rule.id, rateType: rule.rateType === 'HOLIDAY' ? 'HOLIDAY' : 'STANDARD', baseAmount: rule.nightlyPrice, extraMattressAmount, extraChildAmount, total: rule.nightlyPrice + extraMattressAmount + extraChildAmount });
    }
    return { nightlySubtotal, extraGuestSubtotal, total: nightlySubtotal + extraGuestSubtotal, nights, appliedRuleIds, usesHolidayRate: nightlyBreakdown.some((night) => night.rateType === 'HOLIDAY'), nightlyBreakdown };
  }
}
function day(value: string): Date { const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime())) throw invalidQuote(); return date; }
function invalidQuote(): BadRequestException { return new BadRequestException({ code: 'INVALID_PRICE_QUOTE', message: 'Price quote input or matching rate rule is invalid' }); }
