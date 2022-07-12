# innnobics-sahs-adapters

## Installation

### Docker

Running the latest published version of this service:

`docker run ghcr.io/imec-int/innnobics-sahs-adapters:latest`

If you wish to use a specific version, reference another tag (eg 'latest')

`docker run ghcr.io/imec-int/innnobics-sahs-adapters:v1.0.0`

### From source

1. Clone this repository
2. `cd innnobics-sahs-adapters`
3. Install node 16 or use [nvm](https://github.com/nvm-sh/nvm): `nvm use`
4. `npm install`
5. We suggest [https://pm2.keymetrics.io/](pm2) to start the application. 
   1. `npm install pm2`
   2. `node_modules/pm2/bin/pm2 start src/index.js --name resmed-adapter` to start this service as a daemon application. 
6. Visit `http://localhost:8080/` to validate that the service is up and running. If not try running `node_modules/pm2/bin/pm2 ls` 

To stop the application, use `node_modules/pm2/bin/pm2 stop resmed-adapter`

## Development

This paragraph is intended for developers.  

We suggest using [nvm](https://github.com/nvm-sh/nvm) to ensure working with the correct node version. If you do not wish to use nvm, please make sure that the node version listed in `.nvmrc` matches your currently installed node version. You can verify your node version using the `node --version` command. If you do not have node installed, see [https://nodejs.org/en/download/]()

```
nvm use
npm install
node src/index.js
```
