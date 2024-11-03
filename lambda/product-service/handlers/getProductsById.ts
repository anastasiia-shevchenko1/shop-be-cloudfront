import { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { headers, PRODUCTS_TABLE, STOCK_TABLE } from '../constants';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);

export async function getProductsByIdHandler(
  event: any
): Promise<APIGatewayProxyResult> {
  const productId = event?.productId;

  console.log('Request - getProductsById;  params: productId - ', productId);

  const productParams = {
    TableName: process.env.PRODUCTS_TABLE_NAME || PRODUCTS_TABLE,
    Key: { id: productId },
  };

  try {
    const getProductCommand = new GetCommand(productParams);
    const productResult = await docClient.send(getProductCommand);
    const product = productResult.Item;

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    const stockParams = {
      TableName: process.env.STOCK_TABLE_NAME || STOCK_TABLE,
      Key: { product_id: productId },
    };
    const getStockCommand = new GetCommand(stockParams);
    const stockResult = await docClient.send(getStockCommand);
    const finalProduct = {
      ...product,
      count: stockResult.Item ? stockResult.Item.count : 0,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(finalProduct),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Error fetching product details from the database',
      }),
    };
  }
}
