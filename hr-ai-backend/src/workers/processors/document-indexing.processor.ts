import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentIndexingProcessor {
  async handle(documentId: string) {
    return {
      documentId,
      status: 'queued-placeholder',
      note: 'BullMQ processor skeleton for future document chunking and indexing.',
    };
  }
}
