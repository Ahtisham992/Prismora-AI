import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // ----------------------------------------------------------
  // 🔥 Auto-generate short unique username
  // ----------------------------------------------------------
  private async generateUniqueUsername(
    first: string,
    last: string,
  ): Promise<string> {
    const cleaned = (first + last).toLowerCase().replace(/[^a-z0-9]/g, '');

    let root = cleaned.slice(0, 6);
    if (root.length < 3) root = 'user';

    let username: string;

    while (true) {
      const suffix = Math.floor(100 + Math.random() * 900).toString(); // 3 digits
      username = (root + suffix).slice(0, 10); // max 10 chars

      const exists = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!exists) break;
    }

    return username;
  }

  // ----------------------------------------------------------
  // 📌 Local Register
  // ----------------------------------------------------------
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    try {
      const hashed = await bcrypt.hash(data.password, 10);

      // Generate username
      const username = await this.generateUniqueUsername(
        data.firstName,
        data.lastName,
      );

      const user = await this.prisma.user.create({
        data: {
          ...data,
          username,
          password: hashed,
          provider: 'LOCAL',
        },
      });

      return this.generateTokens(user);
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new BadRequestException('Email already exists');
      }

      console.error('REGISTER ERROR:', error);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  // ----------------------------------------------------------
  // 📌 Local Login
  // ----------------------------------------------------------
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  login(user: any) {
    return this.generateTokens(user);
  }

  // ----------------------------------------------------------
  // 📌 JWT Token Generator
  // ----------------------------------------------------------
  generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        provider: user.provider,
        profilePhoto: user.profilePhoto || null,
      },
    };
  }

  // ----------------------------------------------------------
  // 🌐 Google Web OAuth Login/Register
  // ----------------------------------------------------------
  async validateGoogleOAuthUser(profile: any) {
    const email = profile.emails?.[0]?.value;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = await this.generateUniqueUsername(
        profile.name?.givenName || '',
        profile.name?.familyName || '',
      );

      user = await this.prisma.user.create({
        data: {
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          username,
          email,
          googleId: profile.id,
          profilePhoto: profile.photos?.[0]?.value,
          provider: 'GOOGLE',
        },
      });
    }

    return this.generateTokens(user);
  }

  // ----------------------------------------------------------
  // 📱 Google Sign-In (Mobile)
  // ----------------------------------------------------------
  async handleGoogleMobileLogin(idToken: string) {
    console.log('📥 Received Google Token:', idToken);

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      console.log('🔍 Google Token Verified:', ticket);

      const payload = ticket.getPayload();

      console.log('📤 Google Payload:', payload);

      return this.validateGoogleMobileUser(payload);
    } catch (err) {
      console.log('❌ GOOGLE MOBILE TOKEN ERROR:', err);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  // ----------------------------------------------------------
  // 📱 Create/Login Google User (Mobile)
  // ----------------------------------------------------------
  async validateGoogleMobileUser(payload: any) {
    const email = payload.email;

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = await this.generateUniqueUsername(
        payload.given_name || 'user',
        payload.family_name || 'google',
      );

      user = await this.prisma.user.create({
        data: {
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          username,
          email,
          googleId: payload.sub,
          profilePhoto: payload.picture,
          provider: 'GOOGLE',
        },
      });
    }

    return this.generateTokens(user);
  }
}
