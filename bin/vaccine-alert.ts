#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { VaccineAlertStack } from '../lib/vaccine-alert-stack';

const app = new cdk.App();
new VaccineAlertStack(app, 'VaccineAlertStack');
