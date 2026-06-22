import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly internalClient: S3Client;
  private readonly publicClient: S3Client;
  private readonly bucketName = process.env.MINIO_BUCKET_NAME || 'hr-documents';

  constructor() {
    const options = {
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'password123',
      },
      forcePathStyle: true,
    };
    const internalEndpoint =
      process.env.MINIO_INTERNAL_ENDPOINT ||
      `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || internalEndpoint;
    this.internalClient = new S3Client({ ...options, endpoint: internalEndpoint });
    this.publicClient = new S3Client({ ...options, endpoint: publicEndpoint });
  }

  async ensureBucket() {
    try {
      await this.internalClient.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        await this.internalClient.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket ${this.bucketName} created`);
        return;
      }
      throw error;
    }
  }

  async uploadFile(key: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket();
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getFileStream(key: string) {
    const response = await this.internalClient.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    return response.Body;
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const body = await this.getFileStream(key);
    if (!body) return Buffer.alloc(0);
    if ('transformToByteArray' in body) {
      return Buffer.from(await body.transformToByteArray());
    }
    const chunks: Buffer[] = [];
    for await (const chunk of body as Readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.publicClient,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.internalClient.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }
}
