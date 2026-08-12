import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

@Module({ imports: [AuthModule], controllers: [RoomTypesController], providers: [RoomTypesService], exports: [RoomTypesService] })
export class RoomsModule {}
