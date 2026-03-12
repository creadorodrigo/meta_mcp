// src/auth/meta-client.js
// Cliente centralizado para a Graph API do Meta

export class MetaClient {
  constructor(accessToken) {
    this.token = accessToken;
    this.baseUrl = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;
  }

  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('access_token', this.token);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      throw new Error(`Meta API Error [${data.error.code}]: ${data.error.message}`);
    }
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

    if (data.error) {
      throw new Error(`Meta API Error [${data.error.code}]: ${data.error.message}`);
    }
    return data;
  }
}

// Resolve o token e account_id para um cliente pelo nome
export function resolveClient(clientName) {
  const name = clientName.toUpperCase().replace(/\s/g, '_');
  const token = process.env[`META_TOKEN_${name}`];
  const accountId = process.env[`META_ACCOUNT_${name}`];

  if (!token) throw new Error(`Token não encontrado para o cliente: ${clientName}`);

  return {
    client: new MetaClient(token),
    accountId: accountId || null,
    token
  };
}

// Lista todos os clientes configurados
export function listClients() {
  return Object.keys(process.env)
    .filter(k => k.startsWith('META_TOKEN_'))
    .map(k => k.replace('META_TOKEN_', '').toLowerCase());
}
