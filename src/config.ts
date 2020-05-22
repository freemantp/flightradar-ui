import dotenv from 'dotenv'
dotenv.config()

export class Configuration {

  static get CONFIG(): Map<string, string> {

    return new Map(Object.entries({ 
        'flightApiUrl':         '$VUE_APP_FLIGHT_API_URL',
        'flightApiUser':        '$VUE_APP_FLIGHT_API_USERNAME',
        'flightApiPassword':    '$VUE_APP_FLIGHT_API_PASSWORD',
        'hereApiKey':           '$VUE_APP_HERE_API_KEY'
        })); 
  }

  static value (name: string): string | undefined {

    if (!(Configuration.CONFIG.has(name))) {
      console.log(`Configuration: There is no key named "${name}"`)
      return
    }

    const value = Configuration.CONFIG.get(name);

    if (!value) {
      console.log(`Configuration: Value for "${name}" is not defined`)
      return
    }

    if (value.startsWith('$VUE_APP_')) {
      // value was not replaced, it seems we are in development.
      // Remove $ and get current value from process.env
      const envName = value.substr(1)
      const envValue = process.env[envName]
      if (envValue) {
        return envValue
      } else {
        console.log(`Configuration: Environment variable "${envName}" is not defined`)
      }
    } else {
      // value was already replaced, it seems we are in production.
      return value
    }
  }
}