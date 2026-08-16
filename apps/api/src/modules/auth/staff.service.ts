import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAuthUserId(authUserId: string) {
    return this.prisma.staffMember.findUnique({
      where: { authUserId },
    });
  }

  async findActiveByAuthUserId(authUserId: string) {
    return this.prisma.staffMember.findUnique({
      where: { authUserId, isActive: true },
    });
  }
}
