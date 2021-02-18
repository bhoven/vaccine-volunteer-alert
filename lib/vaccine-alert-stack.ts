import * as events from '@aws-cdk/aws-events'
import { Schedule } from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets'
import * as iam from '@aws-cdk/aws-iam'
import * as lambda from '@aws-cdk/aws-lambda'
import * as sns from '@aws-cdk/aws-sns';
import { SmsSubscription } from '@aws-cdk/aws-sns-subscriptions';
import * as cdk from '@aws-cdk/core';
import { CfnParameter } from '@aws-cdk/core';

export class VaccineAlertStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const alertTopic = new sns.Topic(this, 'VaccineAlertTopic');
    const phoneNumberParameter = new CfnParameter(this, 'phoneNumber', {
      type: 'String',
      description: 'Phone number which will receive alerts via SMS'
    })
    const phoneNumber = phoneNumberParameter.valueAsString.startsWith('+1') 
      ? phoneNumberParameter.valueAsString : '+1' + phoneNumberParameter.valueAsString
    alertTopic.addSubscription(new SmsSubscription(phoneNumber))

    const monitorFunction = new lambda.Function(this, 'VaccineHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('src'),
      handler: 'vaccine-monitor.handler',
      environment: {
        ALERT_TOPIC_ARN: alertTopic.topicArn
      }
    })
    const topicAccessPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "sns:ListTopics"
      ]
    })
    topicAccessPolicy.addAllResources()
    monitorFunction.addToRolePolicy(topicAccessPolicy)
    alertTopic.grantPublish(monitorFunction)

    const lambdaTarget = new targets.LambdaFunction(monitorFunction)
    const scheduleRule = new events.Rule(this, 'MonitorScheduleRule', {
      schedule: Schedule.cron({ minute: '0', hour: '*' }),
      targets: [lambdaTarget]
    })
  }
}
