import { randomUUID } from 'crypto';
import { PRODUCTS_TABLE, STOCK_TABLE } from '../constants';

export function collectProductData(data: any) {
  const id = randomUUID();
  const { price, count, ...rest } = data;
  const productCount = count ? parseInt(count) : 10; // Assume default stock count as 10

  const productItem = {
    TableName: process.env.PRODUCTS_TABLE_NAME || PRODUCTS_TABLE,
    Item: {
      id,
      ...rest,
      price: price ? parseInt(price) : 0,
    },
  };

  const stockItem = {
    TableName: process.env.STOCK_TABLE_NAME || STOCK_TABLE,
    Item: {
      product_id: id,
      count: productCount,
    },
  };

  const params = {
    TransactItems: [{ Put: productItem }, { Put: stockItem }],
  };

  return {
    params,
    id,
    productData: {
      id,
      ...rest,
      price: price ? parseInt(price) : 0,
      count: productCount,
    },
  };
}
