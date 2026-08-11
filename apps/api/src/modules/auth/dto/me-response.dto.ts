import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedActorDto {
  @ApiProperty({ format: 'uuid' })
  declare staffProfileId: string;

  @ApiProperty({ format: 'uuid' })
  declare authUserId: string;

  @ApiProperty()
  declare fullName: string;

  @ApiProperty({ format: 'email' })
  declare email: string;

  @ApiProperty({ type: [String], example: ['RECEPTION'] })
  declare roles: string[];

  @ApiProperty({ type: [String], example: ['booking.read', 'booking.create'] })
  declare permissions: string[];
}

export class MeResponseDto {
  @ApiProperty({ type: AuthenticatedActorDto })
  declare actor: AuthenticatedActorDto;
}
