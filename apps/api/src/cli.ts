import "./load-env";
import { HttpException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AuthService } from "./auth.service";
import { CorpusService } from "./corpus.service";

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

async function main() {
  const command = process.argv[2];
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn"] });
  try {
    if (command === "create-admin") {
      const email = arg("--email");
      if (!email) throw new Error("Pass --email");
      const auth = app.get(AuthService);
      const result = await auth.inviteAdmin(email);
      process.stdout.write(`${JSON.stringify({ email, challengeId: result.challengeId })}\n`);
      return;
    }
    if (command === "import-corpus") {
      const corpus = app.get(CorpusService);
      const result = await corpus.importOfficial();
      process.stdout.write(`${JSON.stringify(result)}\n`);
      return;
    }
    throw new Error("Use create-admin --email or import-corpus");
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  let message = "command failed";
  if (error instanceof HttpException) {
    const body = error.getResponse();
    message = typeof body === "object" && body && "message" in body ? String((body as { message: string }).message) : error.message;
  } else if (error instanceof Error) {
    message = error.message;
  }
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
