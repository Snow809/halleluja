import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';

interface AnalyzerResult {
  start: number;
  end: number;
  score: number;
  entity_type: string;
}

@Injectable()
export class PresidioService {
  private readonly logger = new Logger(PresidioService.name);
  private readonly redactionBlock = '░░░░░░░░░░';

  constructor(private readonly config: AppConfigService) {}

  async analyze(text: string, language = 'fr'): Promise<AnalyzerResult[]> {
    if (!text.trim()) return [];
    try {
      const response = await fetch(`${this.config.presidioAnalyzerUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          score_threshold: 0.35,
          entities: ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'LOCATION', 'IBAN_CODE', 'CREDIT_CARD'],
        }),
      });
      if (!response.ok) {
        this.logger.warn(`Presidio analyzer returned ${response.status}`);
        return [];
      }
      return (await response.json()) as AnalyzerResult[];
    } catch (error) {
      this.logger.warn(`Presidio analyzer unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
      return [];
    }
  }

  async anonymize(text: string, analyzerResults?: AnalyzerResult[], language = 'fr'): Promise<string> {
    if (!text.trim()) return text;
    const results = analyzerResults ?? (await this.analyze(text, language));
    if (!results.length) return text;
    try {
      const response = await fetch(`${this.config.presidioAnonymizerUrl}/anonymize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          analyzer_results: results,
          anonymizers: {
            DEFAULT: { type: 'replace', new_value: this.redactionBlock },
          },
        }),
      });
      if (!response.ok) {
        this.logger.warn(`Presidio anonymizer returned ${response.status}`);
        return this.localRedact(text, results);
      }
      const payload = (await response.json()) as { text?: string };
      return payload.text ?? this.localRedact(text, results);
    } catch (error) {
      this.logger.warn(`Presidio anonymizer unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.localRedact(text, results);
    }
  }

  async redact(text: string, language = 'fr'): Promise<string> {
    const results = await this.analyze(text, language);
    return this.anonymize(text, results, language);
  }

  private localRedact(text: string, results: AnalyzerResult[]) {
    return [...results]
      .sort((a, b) => b.start - a.start)
      .reduce((current, result) => {
        return `${current.slice(0, result.start)}${this.redactionBlock}${current.slice(result.end)}`;
      }, text);
  }
}
