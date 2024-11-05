import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { headers } from '../constants';
import { validateProductData } from '../utils/validateProductData';
import { collectProductData } from '../utils/collectProductData';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

export const createProductHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
) => {
  console.log('Request - createProductHandler; data - ', event.body);

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Request body is missing' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid JSON in request body' }),
    };
  }

  if (!validateProductData(data)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid product data' }),
    };
  }

  const { params, productData } = collectProductData(data);

  try {
    await docClient.send(new TransactWriteCommand(params));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Product and stock created successfully',
        product: { ...productData, stockCount: productData.count },
      }),
    };
  } catch (error) {
    console.error('Error creating product and stock:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Error creating product and stock in the database',
      }),
    };
  }
};
