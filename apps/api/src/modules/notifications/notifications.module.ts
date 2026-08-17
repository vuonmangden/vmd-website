import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationInboxController } from './notification-inbox.controller';
import { NotificationInboxService } from './notification-inbox.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationInboxController],
  providers: [NotificationInboxService],
  exports: [NotificationInboxService],
})
export class NotificationsModule {}
