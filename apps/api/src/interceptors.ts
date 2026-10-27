import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Kernel } from "./kernel";

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") return;
    const response = host.switchToHttp().getResponse();
    if (!response?.status) return;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "object" && body && "code" in body && !("statusCode" in (body as object))) {
        response.status(status).json({ error: body });
        return;
      }
      const raw = typeof body === "string" ? body : (body as { message?: string | string[] }).message;
      const message = Array.isArray(raw) ? raw.join(", ") : raw || "Request failed";
      response.status(status).json({ error: { code: status === 400 ? "VALIDATION" : `HTTP_${status}`, message } });
      return;
    }
    response.status(500).json({ error: { code: "INTERNAL", message: "Unexpected error" } });
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly kernel: Kernel) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    if (!req || req.method === "GET" || req.method === "OPTIONS") return next.handle();
    const write = (outcome: string) => {
      const route = String(req.route?.path || req.path || "").split("?")[0].slice(0, 160);
      void this.kernel.prisma.auditLog
        .create({
          data: {
            actorType: req.userId ? "user" : "anonymous",
            actorId: req.userId || null,
            action: `${req.method} ${route} ${outcome}`.slice(0, 180),
            ip: typeof req.ip === "string" ? req.ip.slice(0, 64) : null,
          },
        })
        .catch(() => undefined);
    };
    return next.handle().pipe(
      tap({
        next: () => write("ok"),
        error: () => write("error"),
      }),
    );
  }
}
