import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { aws_iam as iam } from 'aws-cdk-lib';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Load environment variables from .env file
    const envPath = path.join(__dirname, '..', 'lambda', 'authorization-service', '.env');
    const envVars = dotenv.config({ path: envPath }).parsed || {};

    const basicAuthorizer = new lambda.Function(this, 'BasicAuthorizer', {
        runtime: lambda.Runtime.NODEJS_18_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        code: lambda.Code.fromAsset(
          path.join(__dirname, '..', 'lambda', 'authorization-service')
        ),
        handler: 'index.basicAuthorizerHandler',
        environment: envVars
      });

    const apiGatewayPrincipal = new iam.ServicePrincipal('apigateway.amazonaws.com');
    basicAuthorizer.addPermission('InvokeByApiGateway', {
      principal: apiGatewayPrincipal,
      action: 'lambda:InvokeFunction',
      sourceArn: cdk.Stack.of(this).formatArn({
        service: 'execute-api',
        resource: '*',
        resourceName: '*/*/*/*',
      })
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizer.functionArn,
      exportName: 'BasicAuthorizerFunctionArn'
    });
  }
}