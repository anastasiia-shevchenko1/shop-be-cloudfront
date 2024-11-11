import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  Callback,
  PolicyDocument,
} from 'aws-lambda';

export const basicAuthorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: any,
  callback: Callback<APIGatewayAuthorizerResult>
) => {
  console.log('basicAuthorizer', event);

  const { authorizationToken } = event;
  if (!authorizationToken) {
    console.log('No authorizationToken');
    callback('Unauthorized'); // Lambda triggers a 401 HTTP response
    return;
  }

  const encodedCreds = authorizationToken.split(' ')[1];
  const [username, password] = Buffer.from(encodedCreds, 'base64').toString().split(':');

  // There is an issue with account pattern - Member must satisfy regular expression pattern: [a-zA-Z]([a-zA-Z0-9_])+
  const usernameMapping: Record<string, string> = {
    'anastasiia-shevchenko1': 'ANASTASIIASHEVCHENKO1'
  };

  const envVarForUser = usernameMapping[username];
  const storedPassword = process.env[envVarForUser];

  if (!storedPassword || password !== storedPassword) {
    console.log('access denied');
    callback(null, generatePolicy('user', 'Deny', event.methodArn));
    return;
  }

  console.log('access granted');
  callback(null, generatePolicy('user', 'Allow', event.methodArn));
};

const generatePolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string): APIGatewayAuthorizerResult => {
  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [{
      Action: 'execute-api:Invoke',
      Effect: effect,
      Resource: resource
    }]
  };

  return {
    principalId,
    policyDocument,
    context: {}
  };
};