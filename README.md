# vue-radar

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```
## Run as docker container
```
docker run -p 80:80/tcp 
-e VUE_APP_FLIGHT_API_URL='http://path/to/backend/api/v1' \
-e VUE_APP_HERE_API_KEY='my-here-api-key' \
dockerimagename:version
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
