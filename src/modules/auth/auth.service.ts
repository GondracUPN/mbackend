import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .where('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .andWhere('user.isActive = true')
      .andWhere('user.deletedAt IS NULL')
      .getOne();

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      companyId: user.companyId,
      branchId: user.branchId,
      fullName: user.fullName,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };
    const accessToken = await this.jwt.signAsync(authenticatedUser, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '8h'),
    });
    return { accessToken, user: authenticatedUser };
  }
}
