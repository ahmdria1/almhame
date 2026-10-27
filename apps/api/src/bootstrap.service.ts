import { Injectable, OnModuleInit } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CorpusService } from "./corpus.service";

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(
    private readonly corpus: CorpusService,
    private readonly auth: AuthService,
  ) {}

  async onModuleInit() {
    await this.corpus.ensureSample();
    await this.auth.ensureAdmin();
  }
}
