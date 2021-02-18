# Vaccine Volunteer Alert

This project periodically checks for available slots open at the Swedish Community COVID-19 Vaccination Clinic at Seattle University 
and sends a notification via SMS when they are detected.

The project is built using CDK and uses EventBridge to periodically invoke a Lambda.

In order to deploy this project's CloudFormation stack you'll need an AWS account and be configured to use it locally with the AWS CLI. 
The app requires a 10-digit phone number parameter, so you can deploy using the following command:
`cdk deploy --parameters phoneNumber=XXXXXXXXXX`
