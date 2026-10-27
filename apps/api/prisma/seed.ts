import "../src/load-env";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn", "log"] });
  await app.close();
}

void main();
