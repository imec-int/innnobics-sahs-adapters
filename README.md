# Innnobics-sahs-adapters

A REST API, used to extract data from ResMed Airview generated PDF files.  

## Installation

### Docker

Running the latest published version of this service:

`docker run -p 8080:8080 ghcr.io/imec-int/innnobics-sahs-adapters:latest`

If you wish to use a specific version, reference another tag (eg 'latest')

`docker run -p 8080:8080 ghcr.io/imec-int/innnobics-sahs-adapters:v1.0.0`

The application will be available at `http://localhost:8080`

### From source

1. Clone this repository
2. `cd innnobics-sahs-adapters`
3. Install node 16 or use [nvm](https://github.com/nvm-sh/nvm): `nvm use`
4. `npm install`
5. We suggest [pm2](https://pm2.keymetrics.io/) to start the application. 
   1. `npm install pm2`
   2. `node_modules/pm2/bin/pm2 start src/index.js --name resmed-adapter` to start this service as a daemon application. 
6. Visit `http://localhost:8080/` to validate that the service is up and running. If not try running `node_modules/pm2/bin/pm2 ls` 

To stop the application, use `node_modules/pm2/bin/pm2 stop resmed-adapter`

## API

We provide [Swagger](https://swagger.io/) documentation. To validate and test the API:

1. start the application: `docker run -p 8080:8080 ghcr.io/imec-int/innnobics-sahs-adapters:latest`. We use docker for this. See above for alternative methods 
2. Access the documentation on `http://localhost:8080/api/docs`

## Development

This paragraph is intended for developers.  

We suggest using [nvm](https://github.com/nvm-sh/nvm) to ensure working with the correct node version. If you do not wish to use nvm, please make sure that the node version listed in `.nvmrc` matches your currently installed node version. You can verify your node version using the `node --version` command. If you do not have node installed, see [Node downloads](https://nodejs.org/en/download/)

```
nvm use
npm install
node src/index.js
```
