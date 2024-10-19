import { APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';
import { products } from '../mocks/products';
import { Product } from '../model/product';
import { getHeaders } from '../../utils/headers';

const headers = {
  'Content-Type': 'application/json',
};

export async function getProductsByIdHandler(
  event: any
): Promise<APIGatewayProxyResult> {
  try {
    const productId = event?.productId;

    const product: Product | undefined = products.find(
      (p) => p.id === productId
    );

    if (!product) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Product not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(product),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}
