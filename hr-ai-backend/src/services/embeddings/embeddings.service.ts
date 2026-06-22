import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingsService {
  async generateEmbedding(text: string) {
    const dimensions = 64;
    const vector = Array.from({ length: dimensions }, () => 0);
    for (const token of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      let hash = 2166136261;
      for (const character of token) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      vector[Math.abs(hash) % dimensions] += 1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return {
      inputLength: text.length,
      embedding: vector.map((value) => value / magnitude),
      dimensions,
    };
  }
}
