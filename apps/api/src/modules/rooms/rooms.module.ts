import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomRateRulesController } from './room-rate-rules.controller';
import { RoomRateRulesService } from './room-rate-rules.service';

@Module({ imports: [AuthModule], controllers: [RoomTypesController, RoomsController, RoomRateRulesController], providers: [RoomTypesService, RoomsService, RoomRateRulesService], exports: [RoomTypesService, RoomsService, RoomRateRulesService] })
export class RoomsModule {}
