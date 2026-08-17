import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomRateRulesController } from './room-rate-rules.controller';
import { RoomRateRulesService } from './room-rate-rules.service';
import { RoomBlocksController } from './room-blocks.controller';
import { RoomBlocksService } from './room-blocks.service';
import { PriceEngineService } from './price-engine.service';
import { RoomPricingService } from './room-pricing.service';
import { RoomPricingController } from './room-pricing.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { OccupancyService } from './occupancy.service';
import { ResourceHoldsService } from './resource-holds.service';
import { BookingCreationService } from './booking-creation.service';
import { BookingStateService } from './booking-state.service';
import { PublicRoomsController } from './public-rooms.controller';
import { PublicRoomsService } from './public-rooms.service';
import { PaymentsModule } from '../payments/payments.module';
import { PublicBookingsController } from './public-bookings.controller';
import { PublicBookingsService } from './public-bookings.service';
import { BookingLookupController, BookingGuestRequestsController } from './booking-lookup.controller';
import { BookingLookupService } from './booking-lookup.service';
import { BookingLookupRateLimitService } from './booking-lookup-rate-limit.service';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsService } from './admin-bookings.service';
import { CheckInOutController } from './check-in-out.controller';
import { CheckInOutService } from './check-in-out.service';

@Module({ imports: [AuthModule, PaymentsModule], controllers: [RoomTypesController, RoomsController, RoomRateRulesController, RoomBlocksController, RoomPricingController, AvailabilityController, PublicRoomsController, PublicBookingsController, BookingLookupController, BookingGuestRequestsController, AdminBookingsController, CheckInOutController], providers: [RoomTypesService, RoomsService, RoomRateRulesService, RoomBlocksService, PriceEngineService, RoomPricingService, AvailabilityService, OccupancyService, ResourceHoldsService, BookingCreationService, BookingStateService, PublicRoomsService, PublicBookingsService, BookingLookupService, BookingLookupRateLimitService, AdminBookingsService, CheckInOutService], exports: [RoomTypesService, RoomsService, RoomRateRulesService, RoomBlocksService, PriceEngineService, RoomPricingService, AvailabilityService, OccupancyService, ResourceHoldsService, BookingCreationService, BookingStateService, PublicRoomsService, PublicBookingsService, AdminBookingsService, CheckInOutService] })
export class RoomsModule {}
