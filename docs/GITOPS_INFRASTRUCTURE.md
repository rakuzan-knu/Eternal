# GitOps Infrastructure Automation & OIDC Setup

This directory and workflow (`.github/workflows/terraform.yml`) enable GitOps infrastructure management using Terraform and OpenID Connect (OIDC).

## 1. Overview

Infrastructure changes inside `infrastructure/` are automatically validated and planned on Pull Requests, and automatically applied on merges to the `main` branch.

## 2. Cloud OIDC Setup (100% Free Tier)

### AWS OIDC Role Integration

To connect GitHub Actions to AWS without static credentials:

1. Create an IAM OIDC Identity Provider for `https://token.actions.githubusercontent.com`.
2. Create an IAM Role with a trust policy matching your GitHub repository:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:*"
           }
         }
       }
     ]
   }
   ```
3. Set GitHub Repository Secrets:
   - `AWS_ROLE_ARN`: `arn:aws:iam::<ACCOUNT_ID>:role/github-actions-terraform-role`
   - `AWS_REGION`: `us-east-1`
   - `VERCEL_API_TOKEN`: Vercel Personal Access Token

### Remote State Storage

Configure an S3 Bucket + DynamoDB Table for lock management in `infrastructure/main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "social-network-tf-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "social-network-tf-locks"
    encrypt        = true
  }
}
```
