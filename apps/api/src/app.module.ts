import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminService } from "./admin.service";
import { AuthService } from "./auth.service";
import { BillingService } from "./billing.service";
import { BootstrapService } from "./bootstrap.service";
import { CorpusService } from "./corpus.service";
import { ChatGateway } from "./gateway";
import { AdminController, AuthController, HealthController, PaymentController, ProductController } from "./http";
import { AuditInterceptor, ApiExceptionFilter } from "./interceptors";
import { Kernel } from "./kernel";
import { PrismaService } from "./prisma.service";
import { ReminderService } from "./reminders.service";
import { WorkService } from "./work.service";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: "12h" },
      }),
    }),
  ],
  controllers: [HealthController, AuthController, ProductController, PaymentController, AdminController],
  providers: [
    PrismaService,
    Kernel,
    AuthService,
    CorpusService,
    BillingService,
    WorkService,
    ReminderService,
    AdminService,
    BootstrapService,
    ChatGateway,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
