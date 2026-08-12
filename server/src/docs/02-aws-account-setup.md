# AWS Account and Billing Setup

## Creating your account

Sign up for an AWS account with a personal email, not your college email,
since some student email domains block the verification step. Use the AWS
Free Tier — it covers everything you need for club projects for 12 months.

## Setting a budget alert

Immediately after signup, open Billing > Budgets and create a zero-spend
budget alert. This emails you if any charge is about to post, which is the
single most common way students avoid surprise bills.

## Root account vs IAM user

Never use the root account for day-to-day work. Create an IAM user with
AdministratorAccess for yourself, enable MFA on both root and your IAM user,
and store the root password somewhere offline.

## Free tier limits members hit most often

- EC2: 750 hours/month of t2.micro or t3.micro for the first 12 months
- S3: 5 GB standard storage
- Lambda: 1 million free requests per month, always free (not time-limited)
- RDS: 750 hours/month of db.t2.micro/t3.micro/t4g.micro for 12 months

## Shutting resources down

Stop or terminate EC2 instances and delete unused RDS instances at the end
of every work session. Free tier hours are shared across your whole account,
not per project.
