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

@Module({ imports: [AuthModule], controllers: [RoomTypesController, RoomsController, RoomRateRulesController, RoomBlocksController, RoomPricingController, AvailabilityController], providers: [RoomTypesService, RoomsService, RoomRateRulesService, RoomBlocksService, PriceEngineService, RoomPricingService, AvailabilityService, OccupancyService, ResourceHoldsService], exports: [RoomTypesService, RoomsService, RoomRateRulesService, RoomBlocksService, PriceEngineService, RoomPricingService, AvailabilityService, OccupancyService, ResourceHoldsService] })
export class RoomsModule {}
