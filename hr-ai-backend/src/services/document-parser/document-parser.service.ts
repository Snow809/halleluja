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
      const parsed = await pdf(buffer);
      return { filePath, text: parsed.text, pageCount: parsed.numpages };
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
}
