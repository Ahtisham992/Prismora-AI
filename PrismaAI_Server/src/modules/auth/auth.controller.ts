import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------------------------------
  // 📌 Local Register
  // -------------------------------
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // -------------------------------
  // 📌 Local Login
  // -------------------------------
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }

  // -------------------------------
  // 🌐 Web Google OAuth Redirect (Browser flow)
  // -------------------------------
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return { message: 'Redirecting to Google...' };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req: any) {
    return this.authService.validateGoogleOAuthUser(req.user);
  }

  // -------------------------------
  // 📱 Google Sign-In for MOBILE (React Native)
  // -------------------------------
  @Post('google/mobile')
  googleMobile(@Body('googleToken') googleToken: string) {
    return this.authService.handleGoogleMobileLogin(googleToken);
  }
}
