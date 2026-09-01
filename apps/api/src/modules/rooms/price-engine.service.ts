import { BadRequestException, Injectable } from '@nestjs/common';

export interface RateRule { id: string; dateFrom: Date; dateTo: Date; daysOfWeek: number[]; nightlyPrice: bigint; extraAdultPrice: bigint; extraChildPrice: bigint; minNights: number; maxNights: number | null; priority: number; status: string; }
export interface PriceQuote { nightlySubtotal: bigint; extraGuestSubtotal: bigint; total: bigint; nights: number; appliedRuleIds: string[]; }

@Injectable()
export class PriceEngineService {
  quote(rules: RateRule[], dateFrom: string, dateTo: string, adults: number, children: number, includedAdults: number): PriceQuote {
    const start = day(dateFrom); const end = day(dateTo); const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (nights < 1 || !Number.isInteger(adults) || !Number.isInteger(children) || !Number.isInteger(includedAdults) || adults < 1 || children < 0 || includedAdults < 1) throw invalidQuote();
    let nightlySubtotal = 0n; let extraGuestSubtotal = 0n; const appliedRuleIds: string[] = [];
    for (let index = 0; index < nights; index += 1) {
      const stayDate = new Date(start.getTime() + index * 86_400_000);
      const matching = rules.filter((rule) => rule.status === 'ACTIVE' && rule.dateFrom <= stayDate && rule.dateTo > stayDate && (rule.daysOfWeek.length === 0 || rule.daysOfWeek.includes(stayDate.getUTCDay()))).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
      const rule = matching[0];
      if (!rule || nights < rule.minNights || (rule.maxNights !== null && nights > rule.maxNights)) throw invalidQuote();
      nightlySubtotal += rule.nightlyPrice; extraGuestSubtotal += BigInt(Math.max(0, adults - includedAdults)) * rule.extraAdultPrice + BigInt(children) * rule.extraChildPrice; appliedRuleIds.push(rule.id);
    }
    return { nightlySubtotal, extraGuestSubtotal, total: nightlySubtotal + extraGuestSubtotal, nights, appliedRuleIds };
  }
}
function day(value: string): Date { const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime())) throw invalidQuote(); return date; }
function invalidQuote(): BadRequestException { return new BadRequestException({ code: 'INVALID_PRICE_QUOTE', message: 'Price quote input or matching rate rule is invalid' }); }
