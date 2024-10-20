import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { headers, PRODUCTS_TABLE, STOCK_TABLE } from '../../../constants';
import { v4 as uuidv4 } from 'uuid';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

function validateProductData(data: any): boolean {
  return (
    data &&
    typeof data?.title === 'string' &&
    data?.title.trim() !== '' &&
    typeof data?.price === 'number' &&
    data.price > 0
  );
}

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

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid JSON in request body' }),
    };
  }

  if (!validateProductData(parsedBody)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid product data' }),
    };
  }

  const id = uuidv4();
  const productItem = {
    TableName: process.env.PRODUCTS_TABLE_NAME || PRODUCTS_TABLE,
    Item: {
      id,
      ...parsedBody, // Your parsed product data
    },
  };

  const stockItem = {
    TableName: process.env.STOCK_TABLE_NAME || STOCK_TABLE,
    Item: {
      product_id: id,
      count: 10, // Assume default stock count as 10
    },
  };

  const params = {
    TransactItems: [{ Put: productItem }, { Put: stockItem }],
  };

  try {
    await docClient.send(new TransactWriteCommand(params));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Product and stock created successfully',
        product: { ...parsedBody, id, stockCount: 10 },
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
