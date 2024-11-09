import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { products } from '../mocks/products';
import { ProductData, Stock } from '../model/product';
import { fromEnv } from '@aws-sdk/credential-provider-env';

export const PRODUCTS_TABLE = 'Products';
export const STOCK_TABLE = 'Stock';

// Configure AWS
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

const docClient = DynamoDBDocument.from(ddbClient, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: { wrapNumbers: false },
});

const productsData: ProductData[] = products.map(
  ({ count, ...productData }) => productData
);

const stockData: Stock[] = products.map(({ id, count }) => ({
  product_id: id,
  count,
}));

async function populateTables() {
  // Insert products
  for (const product of productsData) {
    const params = {
      TableName: PRODUCTS_TABLE,
      Item: product,
    };
    await docClient.put(params);
    console.log(`Inserted product: ${product.title}`);
  }

  // Insert stock items
  for (const stock of stockData) {
    const params = {
      TableName: STOCK_TABLE,
      Item: stock,
    };
    await docClient.put(params);
    console.log(`Inserted stock for product_id: ${stock.product_id}`);
  }
}

populateTables().catch(console.error);
