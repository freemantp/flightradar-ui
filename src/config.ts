export class Configuration {
  static get CONFIG(): Map<string, string> {
    return new Map(
      Object.entries({
        flightApiUrl: '$VUE_APP_FLIGHT_API_URL',
        flightApiUser: '$VUE_APP_FLIGHT_API_USERNAME',
        flightApiPassword: '$VUE_APP_FLIGHT_API_PASSWORD',
        hereApiKey: '$VUE_APP_HERE_API_KEY',
        mockData: '$VUE_APP_MOCK_DATA',
      }),
    );
  }

  static isMockData(): boolean {
    const isMock: string | undefined = this.value('mockData');

    if (isMock) {
      return isMock == 'true';
    }

    return false;
  }

  static value(name: string): string | undefined {
    if (!Configuration.CONFIG.has(name)) {
      console.log(`Configuration: There is no key named "${name}"`);
      return;
    }

    const value = Configuration.CONFIG.get(name);

    if (value && value.startsWith('$VUE_APP_')) {
      // Value was not replaced, it seems we are in development.
      // Remove $ and get current value from process.env
      const envName = value.substr(1);
      const envValue = process.env[envName];
      if (envValue) {
        return envValue;
      } else {
        console.debug(`Configuration: Environment variable "${envName}" is not defined`);
      }
      // If environment variable is not defined, return undefined
      return undefined;
    } else {
      // Value was already replaced, it seems we are in production.
      return value;
    }
  }
}
