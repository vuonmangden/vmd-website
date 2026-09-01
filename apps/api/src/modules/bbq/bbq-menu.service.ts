import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';

type BbqMenuQueryClient = Pick<Prisma.TransactionClient, 'bbqMenuItem' | 'bbqCombo'>;

export const MENU_GROUPS = [
  'GOI_SALAD_KHAI_VI',
  'RAU_MON_AN_NHE',
  'MON_NUONG',
  'MON_LAU',
  'SOT_CHAM',
] as const;

export type MenuGroup = (typeof MENU_GROUPS)[number];

/** What a guest sees. Deliberately excludes internalNote. */
export interface PublicMenuItem {
  code: string;
  name: string;
  menuGroup: string;
  unit: string;
  price: string;
  publicDescription: string | null;
}

export interface PublicCombo {
  code: string;
  name: string;
  price: string;
  minGuests: number | null;
  maxGuests: number | null;
  composition: string | null;
}

export interface UpsertMenuItemInput {
  code: string;
  name: string;
  menuGroup: string;
  unit: string;
  price: bigint;
  publicDescription?: string;
  internalNote?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

export interface UpsertComboInput {
  code: string;
  name: string;
  price: bigint;
  minGuests?: number;
  maxGuests?: number;
  composition?: string;
  internalNote?: string;
  isAvailable?: boolean;
  displayOrder?: number;
}

@Injectable()
export class BbqMenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public menu. The owner's source menu mixes margin strategy and supplier
   * notes into the same table as dish descriptions, so `internalNote` is left
   * out of the select entirely rather than stripped afterwards — a field that
   * is never fetched cannot leak through a later refactor.
   */
  async publicMenu(): Promise<{ items: PublicMenuItem[]; combos: PublicCombo[] }> {
    const [items, combos] = await this.prisma.$transaction([
      this.prisma.bbqMenuItem.findMany({
        where: { isAvailable: true },
        select: {
          code: true,
          name: true,
          menuGroup: true,
          unit: true,
          price: true,
          publicDescription: true,
        },
        orderBy: [{ menuGroup: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.bbqCombo.findMany({
        where: { isAvailable: true },
        select: {
          code: true,
          name: true,
          price: true,
          minGuests: true,
          maxGuests: true,
          composition: true,
        },
        orderBy: [{ displayOrder: 'asc' }, { price: 'asc' }],
      }),
    ]);

    return {
      items: items.map((item) => ({ ...item, price: item.price.toString() })),
      combos: combos.map((combo) => ({ ...combo, price: combo.price.toString() })),
    };
  }

  /** Admin view: everything, including unavailable rows and internal notes. */
  async adminMenu() {
    const [items, combos] = await this.prisma.$transaction([
      this.prisma.bbqMenuItem.findMany({
        orderBy: [{ menuGroup: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.bbqCombo.findMany({ orderBy: [{ displayOrder: 'asc' }, { price: 'asc' }] }),
    ]);

    return {
      items: items.map((item) => ({ ...item, price: item.price.toString() })),
      combos: combos.map((combo) => ({ ...combo, price: combo.price.toString() })),
    };
  }

  async upsertMenuItem(
    actor: AuthenticatedActor,
    input: UpsertMenuItemInput,
    correlationId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bbqMenuItem.findUnique({
        where: { code: input.code },
        select: { price: true, name: true, isAvailable: true },
      });

      const saved = await tx.bbqMenuItem.upsert({
        where: { code: input.code },
        create: {
          code: input.code,
          name: input.name,
          menuGroup: input.menuGroup,
          unit: input.unit,
          price: input.price,
          publicDescription: input.publicDescription ?? null,
          internalNote: input.internalNote ?? null,
          isAvailable: input.isAvailable ?? true,
          displayOrder: input.displayOrder ?? 0,
        },
        update: {
          name: input.name,
          menuGroup: input.menuGroup,
          unit: input.unit,
          price: input.price,
          publicDescription: input.publicDescription ?? null,
          internalNote: input.internalNote ?? null,
          isAvailable: input.isAvailable ?? true,
          displayOrder: input.displayOrder ?? 0,
        },
      });

      // Menu prices are commercial data; every change is audited so a later
      // "why did we sell at that price" question is answerable.
      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: existing ? 'bbq.menu_item.updated' : 'bbq.menu_item.created',
          resourceType: 'bbq_menu_item',
          resourceId: saved.id,
          beforeData: existing
            ? { name: existing.name, price: existing.price.toString(), isAvailable: existing.isAvailable }
            : undefined,
          afterData: { code: saved.code, name: saved.name, price: saved.price.toString(), isAvailable: saved.isAvailable },
          correlationId,
        },
      });

      return { ...saved, price: saved.price.toString() };
    });
  }

  async upsertCombo(actor: AuthenticatedActor, input: UpsertComboInput, correlationId: string) {
    if (
      input.minGuests !== undefined &&
      input.maxGuests !== undefined &&
      input.minGuests > input.maxGuests
    ) {
      throw new ConflictException({
        code: 'COMBO_GUEST_RANGE_INVALID',
        message: 'Minimum guests cannot exceed maximum guests',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bbqCombo.findUnique({
        where: { code: input.code },
        select: { price: true, name: true, isAvailable: true },
      });

      const saved = await tx.bbqCombo.upsert({
        where: { code: input.code },
        create: {
          code: input.code,
          name: input.name,
          price: input.price,
          minGuests: input.minGuests ?? null,
          maxGuests: input.maxGuests ?? null,
          composition: input.composition ?? null,
          internalNote: input.internalNote ?? null,
          isAvailable: input.isAvailable ?? true,
          displayOrder: input.displayOrder ?? 0,
        },
        update: {
          name: input.name,
          price: input.price,
          minGuests: input.minGuests ?? null,
          maxGuests: input.maxGuests ?? null,
          composition: input.composition ?? null,
          internalNote: input.internalNote ?? null,
          isAvailable: input.isAvailable ?? true,
          displayOrder: input.displayOrder ?? 0,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: existing ? 'bbq.combo.updated' : 'bbq.combo.created',
          resourceType: 'bbq_combo',
          resourceId: saved.id,
          beforeData: existing
            ? { name: existing.name, price: existing.price.toString(), isAvailable: existing.isAvailable }
            : undefined,
          afterData: { code: saved.code, name: saved.name, price: saved.price.toString(), isAvailable: saved.isAvailable },
          correlationId,
        },
      });

      return { ...saved, price: saved.price.toString() };
    });
  }

  /**
   * Price snapshot for a reservation. Returns the current price of each code so
   * the caller can copy it onto the order line — a later menu change must not
   * alter what an existing reservation was quoted.
   *
   * Accepts an optional transaction client so a caller building its own
   * reservation inside a `$transaction` (e.g. BBQ-004) can snapshot prices
   * atomically with the rest of the write. A `tx` cannot batch via its own
   * `$transaction`, so both branches read with `Promise.all` instead.
   */
  async snapshotPrices(
    codes: { itemCodes: string[]; comboCodes: string[] },
    client: BbqMenuQueryClient = this.prisma,
  ) {
    const [items, combos] = await Promise.all([
      client.bbqMenuItem.findMany({
        where: { code: { in: codes.itemCodes }, isAvailable: true },
        select: { code: true, name: true, unit: true, price: true },
      }),
      client.bbqCombo.findMany({
        where: { code: { in: codes.comboCodes }, isAvailable: true },
        select: { code: true, name: true, price: true },
      }),
    ]);

    // An unavailable or unknown code must fail loudly; silently dropping a line
    // would under-charge the guest.
    const missingItems = codes.itemCodes.filter(
      (code) => !items.some((item) => item.code === code),
    );
    const missingCombos = codes.comboCodes.filter(
      (code) => !combos.some((combo) => combo.code === code),
    );

    if (missingItems.length > 0 || missingCombos.length > 0) {
      throw new NotFoundException({
        code: 'BBQ_MENU_ENTRY_UNAVAILABLE',
        message: 'One or more menu entries are unknown or unavailable',
        missingItems,
        missingCombos,
      });
    }

    return {
      items: items.map((item: (typeof items)[number]) => ({
        ...item,
        price: item.price.toString(),
      })),
      combos: combos.map((combo: (typeof combos)[number]) => ({
        ...combo,
        price: combo.price.toString(),
      })),
      snapshotAt: new Date(),
    };
  }
}
