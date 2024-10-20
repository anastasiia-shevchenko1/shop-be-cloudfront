import * as AWS from 'aws-sdk';
import { products } from '../mocks/products';
import { ProductData, Stock } from '../model/product';
import { PRODUCTS_TABLE, STOCK_TABLE } from '../constants';

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

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
    await dynamodb.put(params).promise();
    console.log(`Inserted product: ${product.title}`);
  }

  // Insert stock items
  for (const stock of stockData) {
    const params = {
      TableName: STOCK_TABLE,
      Item: stock,
    };
    await dynamodb.put(params).promise();
    console.log(`Inserted stock for product_id: ${stock.product_id}`);
  }
}

populateTables().catch(console.error);
