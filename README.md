This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Getting Started

### `Prerequisites`

This project requires the AWS CLI to sync local files with S3. You'll need to set up an AWS account if you don't already have one and obtain an access key and a secret key.

#### Sign up for AWS

If you don't have an AWS account, go [here](https://portal.aws.amazon.com/billing/signup#/start) and follow instructions. You shouldn't need to sign up for any paid services.

#### Gather Your Access Key and Secret Key

Once you have an account, log in and follow [these instructions](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) to obtain your access key and secret key.

### `Install and configure AWS CLI`

To install, run

```
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
$ sudo installer -pkg AWSCLIV2.pkg -target /
```

verify it's working by running `which aws` or `aws --version`

you'll then need to configure aws cli

run `aws configure`

when prompted for your Access and Secret keys, provide the ones you obtained in the step above.

default region name and default output format are up to you. `us-west-1` and `json` seem to work fine.

### `Install Node Modules`

run `npm install`

### `Run the server`

run `npm start` from the server directory. This will transpile the typescript for you. You can kill it once it runs successfully.

### `Sync Sites`

run `sh scripts/sync.sh` from project root.

This should create a directory called `cambrianar-sites` in your project root and give you a `sites` subdirectory with at least one site.

If it doesn't, you can cd to `cambrianar-sites` and run `aws s3 sync s3://cambrianar-sites/<site_name> sites/<site_name>`, replacing <site_name> with the name of the site, eg dunn-edwards.

It should also create a symlink in `public/cambrian-sites` that points to `cambrianar-sites/sites`.

NOTE: You may have to run `ln -s ../cambrianar-sites/sites cambrianar-sites` if symlinks are not working properly (you'll get a bunch of missing images)

### `Start Everything`

run `npm start` from root and everything should be working!

## Available Scripts

## build opencv

build opencv, follow the instructions on the emscripten and opencv websites, 
but use 1.39.15 of emscripten as follows, or change the code 
to accommodate the new interface, return cv.ready instead of return cv
https://stackoverflow.com/questions/67190799/how-to-include-cv-imread-when-building-opencv-js

emscripten 
```
./emsdk install 1.39.15
./emsdk activate 1.39.15
```

### sync data

within project directory/sites for a given website:
`aws s3 sync s3://cambrianar-sites/<site_name> sites/<site_name>`

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
