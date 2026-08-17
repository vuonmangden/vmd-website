import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import {
  BOOLEAN_SETTING_KEYS,
  EDITABLE_SETTING_KEYS,
  SETTINGS_CATEGORY,
  SETTINGS_READ_ROLES,
  SETTINGS_WRITE_ROLES,
  SETTING_VALUE_MAX_LENGTH,
  SUPER_ADMIN_ONLY_KEYS,
} from './site-settings.constants';

export interface SiteSettingView {
  key: string;
  value: unknown;
  updatedAt: Date;
}

export interface UpdateSiteSettingInput {
  key: string;
  value: unknown;
}

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthenticatedActor): Promise<SiteSettingView[]> {
    assertCanRead(actor);

    const rows = await this.prisma.appSetting.findMany({
      where: { key: { in: [...EDITABLE_SETTING_KEYS] } },
      select: { key: true, value: true, updatedAt: true },
      orderBy: { key: 'asc' },
    });

    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Writes the setting and its audit record in one transaction. If the audit
   * write fails the setting change rolls back with it — an unaudited
   * settings change is not acceptable (AGENTS.md §12).
   */
  async update(
    actor: AuthenticatedActor,
    input: UpdateSiteSettingInput,
    correlationId: string,
  ): Promise<SiteSettingView> {
    assertCanWrite(actor, input.key);
    const value = normalizeValue(input.key, input.value);

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.appSetting.findUnique({
        where: { key: input.key },
        select: { value: true },
      });

      const saved = await tx.appSetting.upsert({
        where: { key: input.key },
        update: { value: value as never, updatedBy: actor.staffProfileId },
        create: {
          key: input.key,
          value: value as never,
          category: SETTINGS_CATEGORY,
          isSecretReference: false,
          updatedBy: actor.staffProfileId,
        },
        select: { key: true, value: true, updatedAt: true },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'setting.updated',
          resourceType: 'app_settings',
          resourceId: actor.staffProfileId,
          beforeData: before ? ({ key: input.key, value: before.value } as never) : undefined,
          afterData: { key: input.key, value } as never,
          correlationId,
        },
      });

      return { key: saved.key, value: saved.value, updatedAt: saved.updatedAt };
    });
  }
}

function assertCanRead(actor: AuthenticatedActor): void {
  if (!actor.roles.some((role) => SETTINGS_READ_ROLES.includes(role))) {
    throw permissionDenied();
  }
}

function assertCanWrite(actor: AuthenticatedActor, key: string): void {
  if (!EDITABLE_SETTING_KEYS.includes(key)) {
    // Unknown keys are rejected rather than created, so the settings API
    // cannot be used to write arbitrary rows into app_settings.
    throw new BadRequestException({
      code: 'SETTING_NOT_EDITABLE',
      message: 'Setting is not editable',
    });
  }

  if (!actor.permissions.includes('content.manage')) throw permissionDenied();
  if (!actor.roles.some((role) => SETTINGS_WRITE_ROLES.includes(role))) {
    throw permissionDenied();
  }

  if (SUPER_ADMIN_ONLY_KEYS.includes(key) && !actor.roles.includes('SUPER_ADMIN')) {
    throw permissionDenied();
  }
}

function normalizeValue(key: string, value: unknown): string | boolean {
  if (BOOLEAN_SETTING_KEYS.includes(key)) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException({
        code: 'SETTING_VALUE_INVALID',
        message: 'Setting value must be a boolean',
      });
    }
    return value;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException({
      code: 'SETTING_VALUE_INVALID',
      message: 'Setting value must be a string',
    });
  }

  const trimmed = value.trim();
  if (trimmed.length > SETTING_VALUE_MAX_LENGTH) {
    throw new BadRequestException({
      code: 'SETTING_VALUE_TOO_LONG',
      message: 'Setting value is too long',
    });
  }

  return trimmed;
}

function permissionDenied(): ForbiddenException {
  return new ForbiddenException({
    code: 'PERMISSION_DENIED',
    message: 'Permission denied',
  });
}
