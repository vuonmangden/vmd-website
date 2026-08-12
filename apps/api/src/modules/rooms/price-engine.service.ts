import { BadRequestException, Injectable } from '@nestjs/common';

export interface SandboxRateRule { id: string; dateFrom: Date; dateTo: Date; daysOfWeek: number[]; nightlyPrice: bigint; extraAdultPrice: bigint; extraChildPrice: bigint; minNights: number; maxNights: number | null; priority: number; status: string; }
export interface SandboxPriceQuote { nightlySubtotal: bigint; extraGuestSubtotal: bigint; total: bigint; nights: number; appliedRuleIds: string[]; }

@Injectable()
export class PriceEngineService {
  quote(rules: SandboxRateRule[], dateFrom: string, dateTo: string, adults: number, children: number): SandboxPriceQuote {
    const start = day(dateFrom); const end = day(dateTo); const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    if (nights < 1 || !Number.isInteger(adults) || !Number.isInteger(children) || adults < 1 || children < 0) throw invalidQuote();
    let nightlySubtotal = 0n; let extraGuestSubtotal = 0n; const appliedRuleIds: string[] = [];
    for (let index = 0; index < nights; index += 1) {
      const stayDate = new Date(start.getTime() + index * 86_400_000);
      const matching = rules.filter((rule) => rule.status === 'ACTIVE' && rule.dateFrom <= stayDate && rule.dateTo > stayDate && (rule.daysOfWeek.length === 0 || rule.daysOfWeek.includes(stayDate.getUTCDay()))).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
      const rule = matching[0];
      if (!rule || nights < rule.minNights || (rule.maxNights !== null && nights > rule.maxNights)) throw invalidQuote();
      nightlySubtotal += rule.nightlyPrice; extraGuestSubtotal += BigInt(Math.max(0, adults - 1)) * rule.extraAdultPrice + BigInt(children) * rule.extraChildPrice; appliedRuleIds.push(rule.id);
    }
    return { nightlySubtotal, extraGuestSubtotal, total: nightlySubtotal + extraGuestSubtotal, nights, appliedRuleIds };
  }
}
function day(value: string): Date { const date = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(date.getTime())) throw invalidQuote(); return date; }
function invalidQuote(): BadRequestException { return new BadRequestException({ code: 'INVALID_SANDBOX_PRICE_QUOTE', message: 'Sandbox price quote input or matching rate rule is invalid' }); }
