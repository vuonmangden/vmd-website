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

@Module({ imports: [AuthModule], controllers: [RoomTypesController, RoomsController, RoomRateRulesController, RoomBlocksController], providers: [RoomTypesService, RoomsService, RoomRateRulesService, RoomBlocksService], exports: [RoomTypesService, RoomsService, RoomRateRulesService, RoomBlocksService] })
export class RoomsModule {}
