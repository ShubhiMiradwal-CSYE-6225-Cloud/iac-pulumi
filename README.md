# iac-pulumi

This project uses Pulumi and Amazon Web Services (AWS) to set up a Virtual Private Cloud (VPC) with 3 public subnets and 3 private subnets, all in different availability zones in the same region. It also includes the creation of an Internet Gateway, public and private route tables, and configuring a public route to the Internet Gateway. This infrastructure is designed to provide a secure and scalable environment for your AWS resources.

# Prerequisites

Pulumi CLI installed.
AWS CLI configured with the necessary credentials and default region.
Node.js installed on your machine.

# Clone this repository:

git clone https://github.com/your-username/aws-vpc-pulumi.git
cd aws-vpc-pulumi


# install dependencies:
npm install

# Deploy the infrastructure:
pulumi up

