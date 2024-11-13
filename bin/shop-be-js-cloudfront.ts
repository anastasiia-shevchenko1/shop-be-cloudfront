#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { ProductServiceStack } from '../lib/product-service-stack';
import { ImportServiceStack } from '../lib/import-service-stack';
//import { AuthorizationServiceStack } from '../lib/authorization-service-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

// new AuthorizationServiceStack(app, 'AuthorizationServiceStack', { env });
new ProductServiceStack(app, 'ProductServiceStack', { env });
new ImportServiceStack(app, 'ImportServiceStack', { env });
