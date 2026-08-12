import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({ imports: [AuthModule], controllers: [RoomTypesController, RoomsController], providers: [RoomTypesService, RoomsService], exports: [RoomTypesService, RoomsService] })
export class RoomsModule {}
