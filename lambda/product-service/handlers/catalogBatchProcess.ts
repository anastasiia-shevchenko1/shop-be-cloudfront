import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSEvent } from 'aws-lambda';
import { validateProductData } from '../utils/validateProductData';
import { collectProductData } from '../utils/collectProductData';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const snsTopicArn = process.env.SNS_TOPIC_ARN;

export const catalogBatchProcessHandler = async (
  event: SQSEvent
): Promise<any> => {
  console.log('Processing batch from SQS:', event);

  // Iterate over each SQS message
  for (const record of event.Records) {
    const data = JSON.parse(record.body);

    if (data.Type && data.Type === 'Notification') {
      console.log('Received SNS Notification, skipping...');
      continue;
    }

    // Validate product data
    if (!validateProductData(data)) {
      console.error('Invalid product data:', data);
      continue;
    }

    const { params, id, productData } = collectProductData(data);

    try {
      await docClient.send(new TransactWriteCommand(params));
      console.log(`Product inserted/updated in tables:`, productData);

      await snsClient.send(
        new PublishCommand({
          TopicArn: snsTopicArn,
          Message: `New product created: ${JSON.stringify(productData)}`,
          Subject: 'New Product Creation Notification',
        })
      );
    } catch (error) {
      console.error(`Error processing record ${id}:`, error);
    }
  }
};
