# Innnobics-sahs-adapters

A REST API, used to extract data from ResMed Airview generated PDF files.

## Installation

### Docker

Running the latest published version of this service:

```sh
docker run -p 8080:8080 ghcr.io/imec-int/innnobics-sahs-adapters:latest
```

If you wish to use a specific version, reference another tag (eg '1.0.0')

```
docker run -p 8080:8080 ghcr.io/imec-int/innnobics-sahs-adapters:v1.0.0
```

The application will be available at [http://localhost:8080](http://localhost:8080)

### From source

1. Clone this repository
2. `cd innnobics-sahs-adapters`
3. Install node 16.16.0 or use [nvm](https://github.com/nvm-sh/nvm): `nvm use`
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

## Logging

Warning and errors are logged to the console in JSON format.
You can change the level of detail you wish to see in the logs. The available levels conform to the npm log levels:
```
{
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}
```
The log level can be defined through the env variable `LOG_LEVEL`.

To illustrate this: `docker run -p 8080:8080 -e LOG_LEVEL=debug ghcr.io/imec-int/innnobics-sahs-adapters:latest` would print every log statement, except those of level 'silly'.


## Development

This paragraph is intended for developers.

We suggest using [nvm](https://github.com/nvm-sh/nvm) to ensure working with the correct node version. If you do not wish to use nvm, please make sure that the node version listed in `.nvmrc` matches your currently installed node version. You can verify your node version using the `node --version` command. If you do not have node installed, see [Node downloads](https://nodejs.org/en/download/)

```
nvm use
npm install
npm run dev
```

The website is available on `http://localhost:8080/`, the API on `http://localhost:8080/`
