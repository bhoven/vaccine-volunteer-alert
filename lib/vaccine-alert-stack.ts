import * as cloudwatch from '@aws-cdk/aws-cloudwatch'
import * as cwactions from '@aws-cdk/aws-cloudwatch-actions'
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as events from '@aws-cdk/aws-events'
import * as targets from '@aws-cdk/aws-events-targets'
import * as lambda from '@aws-cdk/aws-lambda'
import * as sns from '@aws-cdk/aws-sns';
import { SmsSubscription } from '@aws-cdk/aws-sns-subscriptions';
import * as cdk from '@aws-cdk/core';
import { CfnParameter, Duration } from '@aws-cdk/core';

export class VaccineAlertStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const alertTopic = new sns.Topic(this, 'VaccineAlertTopic', {
      topicName: 'VaccineAlertTopic'
    });
    const phoneNumberParameter = new CfnParameter(this, 'phoneNumber', {
      type: 'String',
      description: 'Phone number which will receive alerts via SMS'
    })
    const phoneNumbers = phoneNumberParameter.valueAsString.split(',')
    phoneNumbers.forEach(phoneNumber => {
      const subscriptionPhoneNumber = phoneNumber.startsWith('+1') ? phoneNumber : '+1' + phoneNumber
      alertTopic.addSubscription(new SmsSubscription(subscriptionPhoneNumber))
    })

    const foundTermsTable = new dynamodb.Table(this, 'FoundTerms', {
      tableName: 'FoundItems',
      partitionKey: { name: 'url', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'term', type: dynamodb.AttributeType.STRING }
    })

    const monitorFunction = new lambda.Function(this, 'VaccineMonitorHandler', {
      functionName: 'VaccineMonitorHandler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('src'),
      handler: 'vaccine-monitor.handler',
      timeout: Duration.seconds(10),
      environment: {
        ALERT_TOPIC_ARN: alertTopic.topicArn,
        FOUND_TERMS_TABLE_NAME: foundTermsTable.tableName
      }
    })
    alertTopic.grantPublish(monitorFunction)
    foundTermsTable.grantReadWriteData(monitorFunction)

    const lambdaTarget = new targets.LambdaFunction(monitorFunction)
    const scheduleRule = new events.Rule(this, 'MonitorScheduleRule', {
      schedule: events.Schedule.cron({ minute: '*/15' }),
      targets: [lambdaTarget]
    })

    const monitorFailureAlarm = monitorFunction.metricErrors().createAlarm(this, 'MonitorFailureAlarm', {
      alarmName: 'MonitorFailureAlarm',
      threshold: 1,
      evaluationPeriods: 1
    })
    monitorFailureAlarm.addAlarmAction(new cwactions.SnsAction(alertTopic))
  }
}
