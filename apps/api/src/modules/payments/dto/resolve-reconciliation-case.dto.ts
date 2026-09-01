import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const RECONCILIATION_OUTCOMES = ['REFUNDED', 'RESTORED', 'OTHER'] as const;
export type ReconciliationOutcome = (typeof RECONCILIATION_OUTCOMES)[number];

export class ResolveReconciliationCaseDto {
  @IsIn(RECONCILIATION_OUTCOMES)
  outcome!: ReconciliationOutcome;

  @IsString()
  @MaxLength(2000)
  note!: string;
}

export class ListReconciliationCasesQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'RESOLVED'])
  status?: 'OPEN' | 'RESOLVED';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}
