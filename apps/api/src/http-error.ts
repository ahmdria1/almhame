import { HttpException } from "@nestjs/common";

export function fail(code: string, status: number, message: string): never {
  throw new HttpException({ code, message }, status);
}
