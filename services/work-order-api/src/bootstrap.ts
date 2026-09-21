import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { REFRESH_TOKEN_COOKIE } from './auth/refresh-token';
import type { Env } from './config/env';

/** HTTP-level setup shared by main.ts and the e2e tests, so tests run the real configuration. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), credentials: true });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('WorkLoop Work-Order API')
      .setDescription(
        'Core domain API for the WorkLoop field-service marketplace.\n\n' +
          '1. Call **POST /auth/login** (or register).\n' +
          '2. Copy `accessToken` from the response.\n' +
          '3. Click **Authorize** and paste it.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth(REFRESH_TOKEN_COOKIE)
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
    swaggerOptions: { persistAuthorization: true },
  });
}
