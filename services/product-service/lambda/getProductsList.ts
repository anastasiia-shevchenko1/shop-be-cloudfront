import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { headers, PRODUCTS_TABLE, STOCK_TABLE } from '../../../constants';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

export const getProductsListHandler: APIGatewayProxyHandler = async () => {
  console.log('Request - getProductsList');

  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME || PRODUCTS_TABLE,
  };

  try {
    const scanCommand = new ScanCommand(params);
    const { Items: products } = await docClient.send(scanCommand);

    const detailedProducts = await Promise.all(
      (products ?? []).map(async (product) => {
        const stockParams = {
          TableName: process.env.STOCK_TABLE_NAME || STOCK_TABLE,
          Key: { product_id: product.id },
        };
        const getCommand = new GetCommand(stockParams);
        const { Item: stockItem } = await docClient.send(getCommand);
        return {
          ...product,
          count: stockItem ? stockItem.count : 0,
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(detailedProducts),
    };
  } catch (error) {
    console.error('Error fetching product list:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Error fetching product list from the database',
      }),
    };
  }
};
