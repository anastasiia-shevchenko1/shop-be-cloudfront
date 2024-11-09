import {
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { importProductsFileHandler } from '../services/import-service/lambda';

// Create a mock instance of the S3Client
const s3Mock = mockClient(S3Client);

describe('importProductsFile', () => {
  beforeEach(() => {
    s3Mock.reset(); // Reset the mock before each test
  });

  it('should create a signed URL', async () => {
    // Mock the PutObjectCommand to return a predefined signed URL
    s3Mock
      .on(PutObjectCommand, {
        Bucket: process.env.BUCKET_NAME,
        Key: expect.stringContaining('uploaded/'), // Expect key to include 'uploaded/'
      })
      .resolves({
        $metadata: {},
        ETag: '"etag1234"',
        VersionId: '1',
      } as PutObjectCommandOutput);

    const mockEvent = {
      queryStringParameters: {
        fileName: 'testfile.csv',
      },
    } as unknown as APIGatewayProxyEvent;

    const response: APIGatewayProxyResult = (await importProductsFileHandler(
      mockEvent,
      {} as AWSLambda.Context,
      () => {}
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).url).toBeDefined();
  });
});
