This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts


### sync data
within project directory/sites for a given website:
```aws s3 sync s3://cambrianar-sites/<site_name> sites/<site_name>```

In the project directory, you can run:

# Prerequisites
Install Python and PIP.

Install CLI tools `awsebcli` if you have not already using one of the following methods: 

OSX:
`brew install awsebcli`

PIP:
`pip install awsebcli`

Or from source:
https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html

Install docker for your computer:

https://runnable.com/docker/

# Specifying the backend
Before running `npm run build` or building the docker image, `.env.production` needs to be edited to have the correct backend urls.

Example:
```
REACT_APP_CB_PRESIGNED_UPLOAD_URL=https://tryonafloor-api.shawinc.com/GetImageUploadPresignedUrl
REACT_APP_CB_SEGMENT_URL=https://tryonafloor-api.shawinc.com/ImageProcessing/segment
```

For development (`npm start`) the corresponding file is `.env.development` which uses local direct upload and segmentation by default.

# Docker Setup
```
docker build -t frontend .
```

## Other Docker commands for reference:
### To clean docker images, including reclaim much disk space:
```
docker system prune
```

### To test the docker image, which is not required for deployment:
```
docker run -d --name frontend- -p 80:80 frontend
```

# Elastic Beanstalk Setup
First create a profile with your credentials in `~/.aws/config` with your access keys. If you wish to use the default profile, it is located at `~/.aws/credentials` It will need credentials to deploy to elastic beanstalk in your AWS account.

```
[profile eb-cli]
aws_access_key_id = XXXXXXXXXXXXX
aws_secret_access_key = XXXXXXXXXXXX
```

Now that the profile is created you can initialize the directory containing the code base and optionally specify the newly created profile.


### Elastic Beanstalk Initialization
```
eb init --profile eb-cli
```

If the credentials specified above were correct, this will have succeeded and ask you for region.

Choose `us-east-1`
```
Select a default region
1) us-east-1 : US East (N. Virginia)
2) us-west-1 : US West (N. California)
3) us-west-2 : US West (Oregon)
4) eu-west-1 : EU (Ireland)
5) eu-central-1 : EU (Frankfurt)
6) ap-south-1 : Asia Pacific (Mumbai)
7) ap-southeast-1 : Asia Pacific (Singapore)
8) ap-southeast-2 : Asia Pacific (Sydney)
9) ap-northeast-1 : Asia Pacific (Tokyo)
10) ap-northeast-2 : Asia Pacific (Seoul)
11) sa-east-1 : South America (Sao Paulo)
12) cn-north-1 : China (Beijing)
13) cn-northwest-1 : China (Ningxia)
14) us-east-2 : US East (Ohio)
15) ca-central-1 : Canada (Central)
16) eu-west-2 : EU (London)
17) eu-west-3 : EU (Paris)
(default is 3): 1
```

Create a new application and give it a name.
```
Select an application to use
Enter Application Name
(default is "shaw-frontend"): 
```

It will now ask if you are using Docker, which this application uses.
```
It appears you are using Docker. Is this correct?
(Y/n): Y
```

We will not be using CodeCommit, so specify no:
```
Note: Elastic Beanstalk now supports AWS CodeCommit; a fully-managed source control service. To learn more, see Docs: https://aws.amazon.com/codecommit/
Do you wish to continue with CodeCommit? (y/N) (default is n): n
```

The next step is to specify the SSL informatioon you will be using, so select Y for using SSL and your SSL information.


```
Do you want to set up SSH for your instances?
(Y/n): Y

Select a keypair.
1) xxx
2) xxxxx
3) [ Create new KeyPair ]
```

### Elastic Beanstalk Creation, Installation, and Deployment

Create an instance using the t2.small instance type
```
eb create -i t2.small
```

Provide a useful name for the instance:
```
Enter Environment Name
(default is shaw-frontend-dev):
```

Enter the appropriate CNAME prefix to use.
```
Enter DNS CNAME prefix
(default is shaw-frontend-dev): 
```

Now it will ask for the load balancer type. We use an application load balancer. The process will take several minutes.

```
Select a load balancer type
1) classic
2) application
3) network
(default is 1): 2
```

If it is successful, you can now open the website via `eb open` or navigate within the AWS console.

Future deployments may now be accomplished using `eb deploy`
