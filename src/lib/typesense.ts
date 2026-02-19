import Typesense from 'typesense';
import { Client } from 'typesense';

let _client: Client | null = null;

function getTypesenseClient(): Client {
  if (!_client) {
    const apiKey = process.env.TYPESENSE_API_KEY;
    if (!apiKey) {
      throw new Error('TYPESENSE_API_KEY environment variable is required');
    }
    _client = new Typesense.Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
          protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
      ],
      apiKey,
      connectionTimeoutSeconds: 2,
    });
  }
  return _client;
}

// Lazy proxy: defers client initialization until first property access
// so the app can start without TYPESENSE_API_KEY for dev
const typesenseClient = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    return Reflect.get(getTypesenseClient(), prop, receiver);
  },
});

export default typesenseClient;

// Collection names
export const STORES_COLLECTION = 'stores';
export const TOOLS_COLLECTION = 'tools';
