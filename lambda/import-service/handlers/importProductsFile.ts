import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { headers } from '../constants';

const s3Client = new S3Client({});

export const importProductsFileHandler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  const fileName = event.queryStringParameters?.name;

  console.log('Request - importProductsFile;  params: fileName - ', fileName);

  if (!fileName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'fileName query parameter is required' }),
    };
  }

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: `uploaded/${fileName}`,
    ContentType: 'text/csv',
  };

  try {
    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(url),
    };
  } catch (error) {
    console.error('Error import product:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Could not create a signed URL: ${(error as Error).message}`,
      }),
    };
  }
};
