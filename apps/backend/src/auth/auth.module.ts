import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TurnstileService } from './turnstile.service';
import { TokenRevocationService } from './token-revocation.service';
import { BloomModule } from '../common/bloom/bloom.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    UsersModule,
    forwardRef(() => SessionsModule),
    BloomModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TurnstileService, TokenRevocationService],
  exports: [AuthService, TurnstileService, TokenRevocationService],
})
export class AuthModule {}
