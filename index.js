"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const config = new pulumi.Config();
const vpcCidrBlockk = config.require("vpcCidrBlock");
const publicSubnetCidrBase = config.require("publicSubnetCidrBase");
const privateSubnetCidrBase = config.require("privateSubnetCidrBase");
const subnetCidrOffset = config.require("subnetCidrOffset");
const destinationCidrBlock = config.require("destinationCidrBlock");
const AWS_REGION = config.require("AWS_REGION");
const ami_id= config.require("ami_id");


const createResource= async()=>
{
const vpc = new aws.ec2.Vpc("main", {
    cidrBlock: vpcCidrBlockk,
    instanceTenancy: "default",
    tags: {
        Name: "main",
    },
    region: AWS_REGION,
});

const internetGateway = new aws.ec2.InternetGateway("gw", {
    vpcId: vpc.id,
    tags: {
        Name: "main",
    },
});

const publicSubnets = [];
const privateSubnets = [];
let publicRouteTable;
let privateRouteTable;
let publicRouteTableAssociation;
let privateRouteTableAssociation;


publicRouteTable = new aws.ec2.RouteTable("public-rt", {
    vpcId: vpc.id,
    tags: {
        Name: "public-rt",
    },
});

privateRouteTable = new aws.ec2.RouteTable("private-rt", {
    vpcId: vpc.id,
    tags: {
        Name: "private-rt",
    },
});

const findAvailabilityZone = async (AWS_REGION) => {
    const az = await aws.getAvailabilityZones({ state: "available" });
    return az.names;
  }
  
async function numberofaz() {
    const azNames = await findAvailabilityZone(AWS_REGION);
    console.log(azNames)
    return azNames.length;
}

  (async () => {
    const numberofAZ = await numberofaz(); 
    const azNames = await findAvailabilityZone(AWS_REGION);
    console.log("Number of Availability Zones:", numberofAZ);


for (let i = 0; i < Math.min(3,numberofAZ); i++) {
    console.log("*************");

    const publicSubnet = new aws.ec2.Subnet(`publicsubnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `${publicSubnetCidrBase}${i}.0/24`,
        availabilityZone: azNames[i],
        mapPublicIpOnLaunch: true,
    });
    publicSubnets.push(publicSubnet);
    console.log(publicSubnets);

    const publicRoute = new aws.ec2.Route(`publicroute-${i}`, {
        routeTableId: publicRouteTable.id,
        destinationCidrBlock: destinationCidrBlock,
        gatewayId: internetGateway.id,
    });

    const privateSubnet = new aws.ec2.Subnet(`privatesubnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `${privateSubnetCidrBase}${i + 3}.0/24`,
        availabilityZone: azNames[i],
    });
    privateSubnets.push(privateSubnet);
    console.log(privateSubnets);

    new aws.ec2.RouteTableAssociation(`public-rt-${i}`, {
        subnetId: publicSubnet.id,
        routeTableId: publicRouteTable.id,
    });

    new aws.ec2.RouteTableAssociation(`private-rt-${i}`, {
        subnetId: privateSubnet.id,
        routeTableId: privateRouteTable.id,
    });
}
})();

const securityGroup = new aws.ec2.SecurityGroup("application security group", {
    ingress: [
        {
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
        },
        {
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
        },
        {
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
        },
        {
            cidrBlocks: ["0.0.0.0/0"],
            protocol: "tcp",
            fromPort: 8080,
            toPort: 8080,   
        },
    ],
    egress: [
        {
            cidrBlocks: ["0.0.0.0/0"],
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
        },
    ],
});


const instance = new aws.ec2.Instance("instance", {
    vpcId: vpc.id,
    ami: ami.id,

    instanceType: "t3.nano",
    vpcSecurityGroupIds: [
        securityGroup.id,
    ],
    keyName: "aws5",
    blockDeviceMappings: [
        {
            deviceName: "/dev/sda1",
            ebs: {
                volumeSize: 25, 
                volumeType: "gp2", 
                deleteOnTermination: true,
            },
        },
    ],
});
exports.vpcId = vpc.id;
}
const vpcId = createResource();
