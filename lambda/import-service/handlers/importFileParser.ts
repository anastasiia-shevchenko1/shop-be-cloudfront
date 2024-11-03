import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandInput,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as csvParser from 'csv-parser';
import { S3Event } from 'aws-lambda';

const s3Client = new S3Client({});

export const importFileParserHandler = async (
  event: S3Event
): Promise<void> => {
  for (const record of event.Records) {
    const getObjectParams: GetObjectCommandInput = {
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    };

    try {
      const data = await s3Client.send(new GetObjectCommand(getObjectParams));

      if (data.Body instanceof Readable) {
        await processCsv(data.Body, getObjectParams);
      } else {
        console.error(
          'Expected data.Body to be a stream Readable, got:',
          typeof data.Body
        );
      }
    } catch (error) {
      console.error(
        `Error fetching the object from S3: ${getObjectParams.Bucket}/${getObjectParams.Key}`,
        error
      );
    }
  }
};

async function processCsv(
  stream: Readable,
  getObjectParams: GetObjectCommandInput
): Promise<void> {
  return new Promise((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on('data', (data) => console.log(data))
      .on('error', (error) => {
        console.error('Error while parsing CSV:', error);
        reject(error);
      })
      .on('end', async () => {
        try {
          console.log('Completed parsing CSV');
          await moveParsedFile(getObjectParams);
          resolve();
        } catch (error) {
          console.error('Error in file management after parsing:', error);
          reject(error);
        }
      });
  });
}

async function moveParsedFile(
  getObjectParams: GetObjectCommandInput
): Promise<void> {
  const copyParams = {
    Bucket: getObjectParams.Bucket,
    CopySource: `${getObjectParams.Bucket}/${getObjectParams.Key}`,
    Key: getObjectParams.Key?.replace('uploaded/', 'parsed/'),
  };
  await s3Client.send(new CopyObjectCommand(copyParams));
  await s3Client.send(new DeleteObjectCommand(getObjectParams));

  console.log('File successfully moved from uploaded to parsed folder');
}
