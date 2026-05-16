import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggerInterceptor } from './middlewares/logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties
      forbidNonWhitelisted: true, // throws error for extra properties
      transform: true, // transforms payloads to DTO instances
    }),
  );
  app.useGlobalInterceptors(new LoggerInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
