import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export const allowedOrigins = [
  'https://d36wgq2gjat4j8.cloudfront.net/',
  'http://localhost:4200',
];

export const PRODUCTS_TABLE = 'Products';
export const STOCK_TABLE = 'Stock';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(
      this,
      'ProductsTable',
      PRODUCTS_TABLE
    );
    const stockTable = dynamodb.Table.fromTableName(
      this,
      'StockTable',
      STOCK_TABLE
    );

    const getProductsList = new lambda.Function(
      this,
      'GetProductsListFunction',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        code: lambda.Code.fromAsset(
          path.join(__dirname, '..', 'lambda', 'product-service')
        ),
        handler: 'index.getProductsListHandler',
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCK_TABLE_NAME: stockTable.tableName,
        },
      }
    );

    const getProductsById = new lambda.Function(
      this,
      'GetProductsByIdFunction',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        code: lambda.Code.fromAsset(
          path.join(__dirname, '..', 'lambda', 'product-service')
        ),
        handler: 'index.getProductsByIdHandler',
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCK_TABLE_NAME: stockTable.tableName,
        },
      }
    );

    const createProduct = new lambda.Function(this, 'CreateProductFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambda', 'product-service')
      ),
      handler: 'index.createProductHandler',
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stockTable.tableName,
      },
    });

    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Product Service API',
      description: 'This service serves products.',
      deployOptions: {
        stageName: 'dev',
      },
    });

    const getProductsIntegration = new apigateway.LambdaIntegration(
      getProductsList,
      {
        requestTemplates: {
          'application/json': '{ "statusCode": "200" }',
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': "$input.path('$.body')",
            },
          },
        ],
        proxy: false,
      }
    );

    const getProductsByIdIntegration = new apigateway.LambdaIntegration(
      getProductsById,
      {
        requestTemplates: {
          'application/json': `
        {
          "productId": "$input.params('productId')"
        }
      `,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': "$input.path('$.body')",
            },
          },
          {
            statusCode: '404',
            responseParameters: {
              'method.response.header.Content-Type': "'application/json'",
            },
            responseTemplates: {
              'application/json': '{"message": "Product not found"}',
            },
          },
        ],
        proxy: false,
      }
    );

    const createProductIntegration = new apigateway.LambdaIntegration(
      createProduct,
      {
        proxy: true,
      }
    );

    const products = api.root.addResource('products');
    const product = products.addResource('{productId}');

    // GET /products
    products.addMethod('GET', getProductsIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });

    // POST /products
    products.addMethod('POST', createProductIntegration, {
      methodResponses: [
        {
          statusCode: '200',
        },
        {
          statusCode: '400',
        },
      ],
    });

    // GET /products/{productId}
    product.addMethod('GET', getProductsByIdIntegration, {
      methodResponses: [
        {
          statusCode: '200',
        },
        {
          statusCode: '404',
        },
      ],
    });

    products.addCorsPreflight({
      allowOrigins: allowedOrigins,
      allowMethods: ['GET', 'POST'],
    });

    product.addCorsPreflight({
      allowOrigins: allowedOrigins,
      allowMethods: ['GET'],
    });
  }
}
