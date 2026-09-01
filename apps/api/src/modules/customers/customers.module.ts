import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CustomersService } from './customers.service';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminCustomersService } from './admin-customers.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminCustomersController],
  providers: [CustomersService, AdminCustomersService],
  exports: [CustomersService, AdminCustomersService],
})
export class CustomersModule {}
