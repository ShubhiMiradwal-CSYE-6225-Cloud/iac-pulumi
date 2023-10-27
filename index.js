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


async function createVPC() {
    const vpc = await new aws.ec2.Vpc("main", {
      cidrBlock: vpcCidrBlockk,
      instanceTenancy: "default",
      tags: {
        Name: "main",
      },
      region: AWS_REGION,
    });
    return vpc;
  }


  async function createInternetGateway(vpcId) {
    const internetGateway = await new aws.ec2.InternetGateway("gw", {
      vpcId: vpcId,
      tags: {
        Name: "main",
      },
    });
    return internetGateway;
  }
  



  async function createPublicRouteTable(vpcId, internetGatewayid) {
    const publicRouteTable = await new aws.ec2.RouteTable("public-rt", {
      vpcId: vpcId,
      tags: {
        Name: "public-rt",
      },
      gatewayId: internetGatewayid,

    });
    return publicRouteTable;
  }


  
  async function createPrivateRouteTable(vpcId) {
    const privateRouteTable = await new aws.ec2.RouteTable("private-rt", {
      vpcId: vpcId,
      tags: {
        Name: "private-rt",
      },
    });
    return privateRouteTable;
  }


    async function createPublicSubnet(vpcId) {
        const availableZones = await aws.getAvailabilityZones();
        const numberofAZ = availableZones.names.length;
        let publicSubnets=[];
        console.log(numberofAZ);
        for (let i = 0; i < Math.min(3,numberofAZ); i++) {
            const publicSubnet = await new aws.ec2.Subnet(`publicsubnet-${i}`, {
                vpcId: vpcId,
                cidrBlock: `${publicSubnetCidrBase}${i}.0/24`,
                availabilityZone: availableZones.names[i],
                mapPublicIpOnLaunch: true,
                
            });
            publicSubnets.push(publicSubnet.id)
        }
        return publicSubnets;

    }

    async function createPublicRoute(i, routeTableId, destinationCidrBlock, gatewayId) {
        return new aws.ec2.Route(`publicroute`, {
            routeTableId: routeTableId,
            destinationCidrBlock: destinationCidrBlock,
            gatewayId: gatewayId,
        });
    }
    


        async function createPrivateSubnet(vpcId) {
            const availableZones = await aws.getAvailabilityZones();
            const numberofAZ = availableZones.names.length;
            let privateSubnets=[];
            for (let i = 0; i < Math.min(3,numberofAZ); i++) {
                const privateSubnet = await new aws.ec2.Subnet(`private-${i}`, {
                    vpcId: vpcId,
                    cidrBlock: `${privateSubnetCidrBase}${i+3}.0/24`,
                    availabilityZone: availableZones.names[i],
                    mapPublicIpOnLaunch: true,  
                });
                privateSubnets.push(privateSubnet.id)
            }
            return privateSubnets;
        }




        async function createpublicroutetableassocation(publicSubnets, publicRouteTable) {
            const associations = [];
            for (let i = 0; i < publicSubnets.length; i++) {
                const pubrouteTableAssociation = new aws.ec2.RouteTableAssociation(`publicRouteTableAssociation${i}`, {
                    subnetId: publicSubnets[i],
                    routeTableId: publicRouteTable.id,
                });
                associations.push(pubrouteTableAssociation);
            }
            return associations;
        }
        
        async function createprivateroutetableassociation(privateSubnets, privateRouteTable) {
            const associations = [];

            for (let i = 0; i < privateSubnets.length; i++) {
                const prirouteTableAssociation = new aws.ec2.RouteTableAssociation(`privateRouteTableAssociation${i}`, {
                    subnetId: privateSubnets[i],
                    routeTableId: privateRouteTable.id,
                });
                console.log(privateSubnets[i].id)
                associations.push(prirouteTableAssociation);
            }
            return associations;
        }


        async function createSecurityGroupInVpc(vpcId) {
            return new aws.ec2.SecurityGroup("application security group", {
                vpcId: vpcId,
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
        }

    async function createDbSecurityGroup(vpcID, securityGroup) {
            return new aws.ec2.SecurityGroup("db-security-group", {
                vpcId: vpcID,
                ingress: [
                    {
                        protocol: "tcp",
                        fromPort: 5432,
                        toPort: 5432,
                        securityGroups: [securityGroup.id],
                    },
                ],
            });
        }
        async function createParameterGroup() {
            return new aws.rds.ParameterGroup("shubhipar", {
                family: "postgres15",
                description: "Default parameter group for postgres15",  
            });
        }
        
    async function createsubnetgroup(privateSubnet) {
            return new aws.rds.SubnetGroup("db-subnet-group", {
                subnetIds: privateSubnet,
                tags: {
                    Name: "db-subnet-group",
                },
            });
        }

        // async function createUserDataScript(username,dbName,port,address,password) {
        //     // let [username, dbName, port, endpoint, password] = args;
        //     return `#!/bin/bash
            
        //     cd /home/admin/webapp
        //     touch .env
        
        //     # Set environment variables in the .env file
        //     echo "DB_USER=${username}" >> .env
        //     echo "DB_NAME=${dbName}" >> .env
        //     echo "DB_PORT=${port}" >> .env
        //     echo "NODE_PORT=8080" >> .env
        //     echo "DB_HOSTNAME=${address}" >> .env
        //     echo "DB_PASSWORD=${password}" >> .env
        //     echo "NODE_ENV=test" >> .env
        //     npx sequelize migrate
        //     cd /home/../etc/systemed/system/
        //     sudo sed -i 's|^Environment=.*$|EnvironmentFile=/home/admin/webapp/.env|' webapp.service
        //     sudo systemctl daemon-reload
        //     "sudo systemctl enable webapp.service",
        //     "sudo systemctl start webapp.service",
        //     sudo systemctl restart webapp.service
        //     `;
        // }



        async function createUserDataScript(username, dbName, port, hostname, password) {
            return pulumi.all([username, dbName, port, hostname, password]).apply(([username, dbName, port, hostname, password]) =>
                `#!/bin/bash          
        
                cd /home/admin/webapp
                touch .env
        
                echo "DB_USER=${username}" >> .env
                echo "DB_NAME=${dbName}" >> .env
                echo "DB_PORT=${port}" >> .env
                echo "NODE_PORT=8080" >> .env
                echo "DB_HOSTNAME=${hostname}" >> .env
                echo "DB_PASSWORD=${password}" >> .env
                echo "NODE_ENV=test" >> .env
               # npx sequelize db:migrate
                # cd systemed/system/
                sudo chown -R user:group /opt/user/webapp
                sudo chmod -R 750  /opt/user/webapp
                sudo systemctl daemon-reload
                sudo systemctl start webapp.service
                sudo systemctl enable webapp.service
                
                # sudo systemctl restart webapp.service
                `
            );
        }

async function createRDSInstance(para_grp, subnetgrp, securityGroupdb) {
    return new aws.rds.Instance("shubhi", {
        dbSubnetGroupName: subnetgrp.name,
        allocatedStorage: 10,
        dbName: "csye6225",
        engine: "postgres",
        engineVersion: "15.3", 
        instanceClass: "db.t3.micro",
        multiAz: false,
        username: "csye6225",
        password: "shubhi2304",
        skipFinalSnapshot: true,
        publiclyAccessible: false,
        parameterGroupName: para_grp.name,
        vpcSecurityGroupIds: [securityGroupdb.id],

    });
}



async function createEC2Instance(amiId, subnetId, securityGroupId,userDataScript) {
    const instance = new aws.ec2.Instance("myInstance", {
        instanceType: "t3.nano",
        ami: amiId,
        subnetId: subnetId,
        keyName: "aws5",
        securityGroups: [securityGroupId],
        rootBlockDevice: {
            volumeSize: 25,
            volumeType: "gp2",
            deleteOnTermination: true,
        },
        userData: userDataScript,
    });
    return instance;
}
        

const createResource= async()=>
{
    const vpc = await createVPC();
    const internetGateway =  await createInternetGateway(vpc.id);
    const publicRouteTable = await createPublicRouteTable(vpc.id, internetGateway.id);
    const privateRouteTable = await createPrivateRouteTable(vpc.id);
    const privateSubnet = await createPrivateSubnet(vpc.id);
    const publicSubnet = await createPublicSubnet(vpc.id);
    const publicRouteTableAssociation = await createpublicroutetableassocation(publicSubnet,publicRouteTable);
    const privateRouteTableAssociation = await createprivateroutetableassociation(privateSubnet,privateRouteTable);
    const securityGroup = await createSecurityGroupInVpc(vpc.id);   
    const createpublicroutetable= await createPublicRoute(vpc.id, publicRouteTable.id, destinationCidrBlock, internetGateway.id)
    const dbSecurityGroup = await createDbSecurityGroup(vpc.id, securityGroup);
    const privateSubnetgroup = await createsubnetgroup(privateSubnet);
    const parameterGroup = await createParameterGroup();
    const rdsinstance= await createRDSInstance(parameterGroup,privateSubnetgroup, dbSecurityGroup);
    const userDataScript1 = await createUserDataScript(rdsinstance.username,rdsinstance.dbName,rdsinstance.port,rdsinstance.address,rdsinstance.password);
    const instance = await createEC2Instance(ami_id, publicSubnet[0],securityGroup.id,userDataScript1);
    
}

createResource();
        
  
