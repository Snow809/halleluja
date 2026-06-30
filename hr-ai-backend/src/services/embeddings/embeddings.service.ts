import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class EmbeddingsService {
  constructor(private readonly config: AppConfigService) {}

  async generateEmbedding(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT') {
    if (!this.config.embeddingBaseUrl || !this.config.embeddingModel) {
      throw new ServiceUnavailableException(
        'Embeddings are not configured. Set EMBEDDING_PROVIDER, EMBEDDING_BASE_URL, EMBEDDING_MODEL, and EMBEDDING_DIMENSIONS.',
      );
    }

    return this.generateOpenAiCompatibleEmbedding(text, taskType);
  }

  private async generateOpenAiCompatibleEmbedding(
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
  ) {
    const response = await fetch(`${this.config.embeddingBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: text,
        encoding_format: 'float',
        user: taskType,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceUnavailableException(
        `Embedding provider returned ${response.status}: ${body.slice(0, 180)}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[] }>;
      model?: string;
    };
    const embedding = payload.data?.[0]?.embedding;
    if (!embedding?.length) {
      throw new ServiceUnavailableException('Embedding provider returned an empty embedding.');
    }
    if (embedding.length !== this.config.embeddingDimensions) {
      throw new ServiceUnavailableException(
        `Embedding provider returned ${embedding.length} dimensions but EMBEDDING_DIMENSIONS is ${this.config.embeddingDimensions}.`,
      );
    }

    return {
      inputLength: text.length,
      embedding,
      dimensions: embedding.length,
      model: payload.model ?? this.config.embeddingModel,
    };
  }
}
