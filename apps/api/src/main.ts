import "./load-env";
import "./instrument";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { loadConfig } from "./config";
import { RELEASE_STAMP } from "./kernel";

export async function createApp() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          formAction: ["'self'", "https:"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  const instance = app.getHttpAdapter().getInstance();
  instance.set("trust proxy", 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  void RELEASE_STAMP;
  return app;
}

async function bootstrap() {
  const app = await createApp();
  const config = loadConfig();
  await app.listen(config.port, "0.0.0.0");
}

if (require.main === module) {
  void bootstrap();
}
