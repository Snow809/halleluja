import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import * as mammoth from 'mammoth';
import * as pdf from 'pdf-parse';

@Injectable()
export class DocumentParserService {
  async parse(filePath: string) {
    const buffer = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    return this.parseBuffer(buffer, extension, filePath);
  }

  async parseBuffer(buffer: Buffer, fileType: string, filePath = 'object-storage') {
    const extension = fileType.startsWith('.') ? fileType.toLowerCase() : `.${fileType.toLowerCase()}`;
    if (extension === '.pdf') {
      try {
        const parsed = await pdf(buffer);
        return { filePath, text: parsed.text, pageCount: parsed.numpages };
      } catch {
        const fallbackText = this.extractPlainPdfText(buffer);
        if (fallbackText.trim()) {
          return { filePath, text: fallbackText, pageCount: 1 };
        }
        throw new BadRequestException('PDF document could not be parsed');
      }
    }
    if (extension === '.docx') {
      const parsed = await mammoth.extractRawText({ buffer });
      return { filePath, text: parsed.value, pageCount: undefined };
    }
    if (extension === '.txt' || extension === '.md') {
      return { filePath, text: buffer.toString('utf8'), pageCount: undefined };
    }
    throw new BadRequestException('Only PDF, DOCX and TXT documents can be indexed');
  }

  private extractPlainPdfText(buffer: Buffer) {
    const raw = buffer.toString('latin1');
    const matches = [...raw.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g)];
    return matches
      .map((match) =>
        match[1]
          .replace(/\\\)/g, ')')
          .replace(/\\\(/g, '(')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t'),
      )
      .join('\n');
  }
}
