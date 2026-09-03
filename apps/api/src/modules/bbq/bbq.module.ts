import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import {
  AdminBbqAreaController,
  AdminBbqServiceSlotController,
  AdminBbqTableController,
  PublicBbqAreaController,
} from './bbq-area.controller';
import { BbqAreaService } from './bbq-area.service';
import { PublicBbqAvailabilityController } from './bbq-availability.controller';
import { BbqAvailabilityService } from './bbq-availability.service';
import { AdminBbqMenuController, PublicBbqMenuController } from './bbq-menu.controller';
import { BbqMenuService } from './bbq-menu.service';
import { AdminBbqReservationController } from './bbq-reservation.controller';
import { BbqReservationCreationService } from './bbq-reservation-creation.service';
import { BbqReservationStateService } from './bbq-reservation-state.service';
import { AdminBbqReservationsService } from './admin-bbq-reservations.service';
import { PublicBbqReservationsController } from './public-bbq-reservations.controller';
import { PublicBbqReservationsService } from './public-bbq-reservations.service';
import { PublicBbqRateLimitService } from './public-bbq-rate-limit.service';

@Module({
  imports: [PrismaModule, AuthModule, PaymentsModule],
  controllers: [
    PublicBbqMenuController,
    PublicBbqAreaController,
    PublicBbqAvailabilityController,
    AdminBbqMenuController,
    AdminBbqAreaController,
    AdminBbqTableController,
    AdminBbqServiceSlotController,
    AdminBbqReservationController,
    PublicBbqReservationsController,
  ],
  providers: [
    BbqMenuService,
    BbqAreaService,
    BbqAvailabilityService,
    BbqReservationCreationService,
    BbqReservationStateService,
    AdminBbqReservationsService,
    PublicBbqReservationsService,
    PublicBbqRateLimitService,
  ],
  exports: [
    BbqMenuService,
    BbqAreaService,
    BbqAvailabilityService,
    BbqReservationCreationService,
    BbqReservationStateService,
    AdminBbqReservationsService,
  ],
})
export class BbqModule {}
