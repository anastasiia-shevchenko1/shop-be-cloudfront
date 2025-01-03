import * as cdk from 'aws-cdk-lib';
import {
  aws_apigateway as apigateway,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_s3_notifications as s3n,
} from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
import * as dotenv from 'dotenv';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'ProductsImportBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.PUT,
            HttpMethods.POST,
            HttpMethods.DELETE,
            HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    });
    bucket.addLifecycleRule({
      prefix: 'uploaded/',
      transitions: [
        {
          transitionAfter: cdk.Duration.days(30),
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
        },
      ],
    });

    // const basicAuthorizerArn = cdk.Fn.importValue('BasicAuthorizerFunctionArn');
    // const basicAuthorizerLambda = lambda.Function.fromFunctionArn(this, 'ImportedBasicAuthorizer', basicAuthorizerArn);

    const envPath = path.join(__dirname, '..', '.env');
    const envVars = dotenv.config({ path: envPath }).parsed || {};

    const basicAuthorizerLambda = new lambda.Function(this, 'BasicAuthorizerFunc', {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambda', 'authorization-service')
      ),
      handler: 'index.basicAuthorizerHandler',
      environment: envVars
    });

    const api = new apigateway.RestApi(this, 'importApi', {
      restApiName: 'Import Service',
      description: 'This service import product files',
      deployOptions: {
        stageName: 'dev',
      },
    });

    const authorizer = new apigateway.TokenAuthorizer(this, 'BasicAuthorizer', {
      handler: basicAuthorizerLambda,
      identitySource: 'method.request.header.Authorization'
    });

    // ImportProductsFile Lambda
    const importProductsFile = new lambda.Function(this, 'ImportProductsFile', {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambda', 'import-service')
      ),
      handler: 'index.importProductsFileHandler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    importProductsFile.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [bucket.bucketArn + '/uploaded/*'],
    }));

    const integration = new apigateway.LambdaIntegration(importProductsFile);

    const resource = api.root.addResource('import');
    resource.addMethod('GET', integration, {
      authorizer: authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    const catalogItemsQueueUrl = cdk.Fn.importValue('CatalogItemsQueueUrl');

    // ImportFileParser Lambda
    const importFileParser = new lambda.Function(this, 'ImportFileParser', {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambda', 'import-service')
      ),
      handler: 'index.importFileParserHandler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
        SQS_QUEUE_URL: catalogItemsQueueUrl,
      },
    });

    // IAM Policy for ImportFileParser Lambda
    const parserPolicy = new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:CopyObject',
        's3:DeleteObject',
        's3:PutObject',
      ],
      resources: [
        bucket.bucketArn + '/uploaded/*',
        bucket.bucketArn + '/parsed/*',
      ],
    });
    importFileParser.addToRolePolicy(parserPolicy);

    const sqsPolicy = new iam.PolicyStatement({
      actions: ['sqs:SendMessage'],
      resources: ['arn:aws:sqs:us-east-1:968927363816:catalogItemsQueue'],
    });
    importFileParser.addToRolePolicy(sqsPolicy);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: 'uploaded/' }
    );
  }
}
