# flightradar-ui

A Vue.js application for tracking and displaying flight radar information.

## Project setup

### Install dependencies
```
npm install
```

### Configuration

Create a `.env.local` file in the project root with the following variables:

```
# Flight Radar API Configuration
VUE_APP_FLIGHT_API_URL=http://your-api-url/api
VUE_APP_FLIGHT_API_USERNAME=username
VUE_APP_FLIGHT_API_PASSWORD=password

# Here Maps API Key - Get yours at https://developer.here.com/
VUE_APP_HERE_API_KEY=your-here-api-key-goes-here

# Use mock data if API is unavailable (true/false)
VUE_APP_MOCK_DATA=true
```

#### Mock Data

If you don't have access to the flight radar API, you can set `VUE_APP_MOCK_DATA` to `true` to use mock data instead.

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

## Error Handling

The application includes robust error handling for network errors and API issues. When using mock data (`VUE_APP_MOCK_DATA=true`), the application will work without a real API connection.

## Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
