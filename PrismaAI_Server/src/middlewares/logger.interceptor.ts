import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    const method = req.method;
    const url = req.originalUrl || req.url;
    const body = req.body;

    const start = Date.now();

    console.log(`📥 [REQUEST] ${method} ${url}`, {
      body,
      headers: req.headers,
    });

    return next.handle().pipe(
      tap((responseData) => {
        const duration = Date.now() - start;

        console.log(`📤 [RESPONSE] ${method} ${url}`, {
          duration: `${duration}ms`,
          status: context.switchToHttp().getResponse().statusCode,
          response: responseData,
        });
      }),
    );
  }
}
