// src/auth/meta-client.js
import 'dotenv/config';

export class MetaClient {
  constructor() {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) throw new Error('META_ACCESS_TOKEN não configurado no .env');
    this.token = token;
    this.baseUrl = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;
  }

  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('access_token', this.token);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) throw new Error(`Meta API Error [${data.error.code}]: ${data.error.message}`);
    return data;
  }

  async post(endpoint, body = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: this.token })
    });
    const data = await res.json();
    if (data.error) throw new Error(`Meta API Error [${data.error.code}]: ${data.error.message}`);
    return data;
  }
}

let _client = null;
export function getClient() {
  if (!_client) _client = new MetaClient();
  return _client;
}

export function resolveAccountId(clientName, accountId = null) {
  if (accountId) return accountId;
  const name = clientName.toUpperCase().replace(/[\s-]/g, '_');
  const envId = process.env[`META_ACCOUNT_${name}`];
  if (!envId) throw new Error(
    `account_id não encontrado para "${clientName}". ` +
    `Passe "account_id" na chamada ou configure META_ACCOUNT_${name} no .env`
  );
  return envId;
}

export function listClients() {
  return Object.keys(process.env)
    .filter(k => k.startsWith('META_ACCOUNT_'))
    .map(k => k.replace('META_ACCOUNT_', '').toLowerCase());
}
