import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    // Define only specific env variables needed by the app for security
    define: {
      'process.env.VUE_APP_FLIGHT_API_URL': JSON.stringify(env.VUE_APP_FLIGHT_API_URL),
      'process.env.VUE_APP_FLIGHT_API_USERNAME': JSON.stringify(env.VUE_APP_FLIGHT_API_USERNAME), 
      'process.env.VUE_APP_FLIGHT_API_PASSWORD': JSON.stringify(env.VUE_APP_FLIGHT_API_PASSWORD),
      'process.env.VUE_APP_HERE_API_KEY': JSON.stringify(env.VUE_APP_HERE_API_KEY),
      'process.env.VUE_APP_MOCK_DATA': JSON.stringify(env.VUE_APP_MOCK_DATA),
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || mode)
    }
  }
});