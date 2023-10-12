"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

const vpc = new aws.ec2.Vpc("main", {
    cidrBlock: "10.0.0.0/16",
    instanceTenancy: "default",
    tags: {
        Name: "main",
    },
});

const internetGateway = new aws.ec2.InternetGateway("gw", {
    vpcId: vpc.id,
    tags: {
        Name: "main",
    },
});
const az = aws.getAvailabilityZones({ state: "available" });

const publicSubnets = [];
const privateSubnets = [];
let publicRouteTable;
let publicRouteTableAssociation; 
let privateRouteTable;
let privateRouteTableAssociation; 

for (let i = 0; i < 3; i++) {
    const publicSubnet = new aws.ec2.Subnet(`public-subnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${i}.0/24`,
        availabilityZone: az[i],
        mapPublicIpOnLaunch: true,
    });
    publicSubnets.push(publicSubnet);

    publicRouteTable = new aws.ec2.RouteTable(`public-rt-${i}`, {
        vpcId: vpc.id,
        tags: {
            Name: `public-rt-${i}`,
        },
    });

    publicRouteTableAssociation = new aws.ec2.RouteTableAssociation(`public-rt-assoc-${i}`, {
        subnetId: publicSubnet.id,
        routeTableId: publicRouteTable.id,
    });

    const publicRoute = new aws.ec2.Route(`public-route-${i}`, {
        routeTableId: publicRouteTable.id,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: internetGateway.id,
    });

    const privateSubnet = new aws.ec2.Subnet(`private-subnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${i + 3}.0/24`,
        availabilityZone: az[i],
    });
    privateSubnets.push(privateSubnet);


    privateRouteTable = new aws.ec2.RouteTable(`private-rt-${i}`, {
        vpcId: vpc.id,
        tags: {
            Name: `public-rt-${i}`,
        },
    });

    privateRouteTableAssociation = new aws.ec2.RouteTableAssociation(`private-rt-assoc-${i}`, {
        subnetId: privateSubnet.id,
        routeTableId: privateRouteTable.id,
    });

}

exports.vpcId = vpc.id;
exports.publicSubnetIds = publicSubnets.map(subnet => subnet.id);
exports.privateSubnetIds = privateSubnets.map(subnet => subnet.id);
exports.publicRouteTableId = publicRouteTable.id;
exports.publicRouteTableAssociationIds = publicRouteTableAssociation.id;


exports.privateRouteTableId = privateRouteTable.id;
exports.privateRouteTableAssociationIds = privateRouteTableAssociation.id;
