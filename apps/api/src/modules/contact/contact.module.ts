import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SecurityConfigService } from '../../common/security/security.config';
import { AdminContactController } from './admin-contact.controller';
import { PublicContactController } from './public-contact.controller';
import { ContactRateLimitService } from './contact-rate-limit.service';
import { ContactService } from './contact.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicContactController, AdminContactController],
  providers: [ContactService, ContactRateLimitService, SecurityConfigService],
  exports: [ContactService],
})
export class ContactModule {}
