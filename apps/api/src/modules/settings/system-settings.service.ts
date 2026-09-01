import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Nest needs runtime DI metadata.
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedActor } from '../auth/auth.types';
import { SYSTEM_SETTING_KEYS, SYSTEM_SETTING_SCHEMAS, SYSTEM_SETTINGS_ROLES } from './system-settings.constants';

export interface SystemSettingView {
  key: string;
  category: string;
  /** `null` whenever `isSecretReference` is true — secrets are never read back to the UI, even though the stored value is only ever a reference name/path (FND-005 §10.4), never the real secret. */
  value: unknown;
  isSecretReference: boolean;
  updatedAt: Date;
}

export interface UpdateSystemSettingInput {
  key: string;
  value: unknown;
  /** Optimistic concurrency per techspec §43.3: the `updatedAt` the client last read. Omit to skip the check. */
  expectedUpdatedAt?: string;
}

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthenticatedActor): Promise<SystemSettingView[]> {
    assertCanRead(actor);

    const rows = await this.prisma.appSetting.findMany({
      where: { key: { in: [...SYSTEM_SETTING_KEYS] } },
      select: { key: true, value: true, category: true, isSecretReference: true, updatedAt: true },
      orderBy: { key: 'asc' },
    });

    return rows.map(toView);
  }

  /**
   * Writes the setting and its audit record in one transaction. If the audit
   * write fails the setting change rolls back with it — an unaudited
   * settings change is not acceptable (AGENTS.md §12).
   */
  async update(
    actor: AuthenticatedActor,
    input: UpdateSystemSettingInput,
    correlationId: string,
  ): Promise<SystemSettingView> {
    assertCanWrite(actor);
    const schema = SYSTEM_SETTING_SCHEMAS[input.key];
    if (!schema) throw settingNotEditable();
    const value = schema.normalize(input.value);

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.appSetting.findUnique({
        where: { key: input.key },
        select: { value: true, isSecretReference: true, updatedAt: true },
      });

      if (
        input.expectedUpdatedAt !== undefined &&
        before !== null &&
        before.updatedAt.toISOString() !== input.expectedUpdatedAt
      ) {
        throw new ConflictException({
          code: 'RESOURCE_VERSION_CONFLICT',
          message: 'Setting was changed by someone else since it was last read',
        });
      }

      const saved = await tx.appSetting.upsert({
        where: { key: input.key },
        update: { value: value as never, updatedBy: actor.staffProfileId },
        create: {
          key: input.key,
          value: value as never,
          category: schema.category,
          isSecretReference: false,
          updatedBy: actor.staffProfileId,
        },
        select: { key: true, value: true, category: true, isSecretReference: true, updatedAt: true },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'STAFF',
          actorId: actor.staffProfileId,
          action: 'setting.updated',
          resourceType: 'app_settings',
          resourceId: actor.staffProfileId,
          beforeData: before
            ? ({ key: input.key, value: before.isSecretReference ? '[secret]' : before.value } as never)
            : undefined,
          afterData: { key: input.key, value } as never,
          correlationId,
        },
      });

      return toView(saved);
    });
  }
}

function toView(row: { key: string; value: unknown; category: string; isSecretReference: boolean; updatedAt: Date }): SystemSettingView {
  return {
    key: row.key,
    category: row.category,
    value: row.isSecretReference ? null : row.value,
    isSecretReference: row.isSecretReference,
    updatedAt: row.updatedAt,
  };
}

function assertCanRead(actor: AuthenticatedActor): void {
  if (!actor.roles.some((role) => SYSTEM_SETTINGS_ROLES.includes(role))) {
    throw permissionDenied();
  }
}

function assertCanWrite(actor: AuthenticatedActor): void {
  if (!actor.permissions.includes('content.manage')) throw permissionDenied();
  if (!actor.roles.some((role) => SYSTEM_SETTINGS_ROLES.includes(role))) {
    throw permissionDenied();
  }
}

function settingNotEditable(): BadRequestException {
  // Unknown keys — including CMS-001's site-settings keys, which are edited
  // through /admin/site-settings instead — are rejected rather than created,
  // so this endpoint cannot be used to write arbitrary app_settings rows.
  return new BadRequestException({
    code: 'SETTING_NOT_EDITABLE',
    message: 'Setting is not editable through this endpoint',
  });
}

function permissionDenied(): ForbiddenException {
  return new ForbiddenException({
    code: 'PERMISSION_DENIED',
    message: 'Permission denied',
  });
}
