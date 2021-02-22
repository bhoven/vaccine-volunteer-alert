# Vaccine Volunteer Alert

This project periodically checks for available slots open at the Swedish Community COVID-19 Vaccination Clinic at Seattle University 
and sends a notification via SMS when they are detected.

The project is built using CDK and uses EventBridge to periodically invoke a Lambda.

In order to deploy this project's CloudFormation stack you'll need an AWS account and be configured to use it locally with the AWS CLI. 
The app requires a 10-digit phone number parameter, so you can deploy using the following command:
`cdk deploy --parameters phoneNumber=XXXXXXXXXX`

You can use multiple phone numbers separated by commas.

## Running locally

You can run the app locally using SAM. To set this up:
1. Install Docker (if you haven't already)
1. Create a Docker network: `docker network create lambda-local`
1. Add DynamoDB to Docker: `docker pull amazon/dynamodb-local`
1. Run DynamoDB locally: `docker run -v "$PWD":/dynamodb_local_db -p 8000:8000 --network=lambda-local --name dynamodb amazon/dynamodb-local:latest &`
1. Create the `FoundTerms` table:
`aws dynamodb create-table --table-name FoundTerms --attribute-definitions AttributeName=url,AttributeType=S AttributeName=term,AttributeType=S --key-schema AttributeName=url,KeyType=HASH AttributeName=term,KeyType=RANGE --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --endpoint-url http://0.0.0.0:8000`
1. Run Lambda: `sam local invoke VaccineMonitorHandlerXXXXXXXX --env-vars environment.json --docker-network lambda-local` (replace XXXXXXXX with your Lambda element name)

## Run via Visual Studio Code
Install the AWS plug-in and create the following launch configuration:

    {
        "configurations": [
            {
                "type": "aws-sam",
                "request": "direct-invoke",
                "name": "vaccine-volunteer-alert",
                "invokeTarget": {
                    "target": "code",
                    "projectRoot": "src",
                    "lambdaHandler": "vaccine-monitor.handler"
                },
                "lambda": {
                    "runtime": "nodejs14.x",
                    "payload": {},
                    "environmentVariables": {
                        "FOUND_TERMS_TABLE_NAME": "FoundTerms",
                        "ALERT_TOPIC_ARN": "arn:aws:sns:us-west-2:155607981922:VaccineAlertTopic"
                    }
                },
                "sam": {
                    "dockerNetwork": "lambda-local"
                }
            }
        ]
    }