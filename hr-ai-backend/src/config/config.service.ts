import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return Number(this.configService.get<string>('PORT') ?? 3000);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'development-secret';
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d';
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET') ?? this.jwtSecret;
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  get uploadDir(): string {
    return this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
  }

  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST') ?? 'localhost';
  }

  get redisPort(): number {
    return Number(this.configService.get<string>('REDIS_PORT') ?? 6379);
  }

  get openCodeGoApiKey(): string {
    return this.configService.get<string>('OPENCODE_GO_API_KEY') ?? '';
  }

  get openCodeGoBaseUrl(): string {
    return (this.configService.get<string>('OPENCODE_GO_BASE_URL') ?? 'https://opencode.ai/zen/go/v1').replace(/\/$/, '');
  }

  get openCodeGoModel(): string {
    return this.configService.get<string>('OPENCODE_GO_MODEL') ?? 'deepseek-v4-flash';
  }

  get llmTimeoutMs(): number {
    return Number(this.configService.get<string>('LLM_TIMEOUT_MS') ?? 30000);
  }

  get llmMaxRetries(): number {
    return Number(this.configService.get<string>('LLM_MAX_RETRIES') ?? 2);
  }

  get corsOrigins(): string[] {
    return (this.configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get embeddingBaseUrl(): string {
    return (this.configService.get<string>('EMBEDDING_BASE_URL') ?? '').replace(/\/$/, '');
  }

  get embeddingProvider(): string {
    return (this.configService.get<string>('EMBEDDING_PROVIDER') ?? 'tei').toLowerCase();
  }

  get embeddingModel(): string {
    return this.configService.get<string>('EMBEDDING_MODEL') ?? 'text-embeddings-inference';
  }

  get embeddingDimensions(): number {
    return Number(this.configService.get<string>('EMBEDDING_DIMENSIONS') ?? 384);
  }
}
