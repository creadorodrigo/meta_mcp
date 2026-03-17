// src/tools/meta-ads.js
// Ferramentas completas de Meta Ads

import { getClient, resolveAccountId, listClients } from '../auth/meta-client.js';

export const metaAdsTools = [
  // ─── CONTAS ───────────────────────────────────────────
  {
    name: 'list_clients',
    description: 'Lista clientes configurados no servidor. Use apenas se não souber o account_id. Se o usuário fornecer o account_id diretamente, NÃO chame esta tool.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'get_account_info',
    description: 'Retorna informações da conta de anúncios (saldo, moeda, status). Forneça account_id diretamente (ex: act_949878915087001).',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional, só se account_id não fornecido)' }
      },
      required: ['account_id']
    }
  },

  // ─── CAMPANHAS ────────────────────────────────────────
  {
    name: 'get_campaigns',
    description: 'Lista campanhas de uma conta do Meta Ads. Use account_id diretamente (ex: act_949878915087001). NÃO chame list_clients antes.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL'], default: 'ALL' },
        limit: { type: 'number', default: 25 }
      },
      required: ['account_id']
    }
  },
  {
    name: 'create_campaign',
    description: 'Cria uma nova campanha no Meta Ads.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        name: { type: 'string', description: 'Nome da campanha' },
        objective: {
          type: 'string',
          enum: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT',
                 'OUTCOME_LEADS', 'OUTCOME_APP_PROMOTION', 'OUTCOME_SALES']
        },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], default: 'PAUSED' },
        daily_budget: { type: 'number', description: 'Em centavos (ex: 5000 = R$50)' },
        lifetime_budget: { type: 'number', description: 'Em centavos' },
        special_ad_categories: { type: 'array', items: { type: 'string' }, default: [] }
      },
      required: ['account_id', 'name', 'objective']
    }
  },
  {
    name: 'update_campaign',
    description: 'Atualiza status, orçamento ou nome de uma campanha.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        campaign_id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'] },
        daily_budget: { type: 'number' },
        lifetime_budget: { type: 'number' }
      },
      required: ['account_id', 'campaign_id']
    }
  },

  // ─── ADSETS ───────────────────────────────────────────
  {
    name: 'get_adsets',
    description: 'Lista conjuntos de anúncios de uma conta ou campanha. Use account_id diretamente.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        campaign_id: { type: 'string', description: 'Filtrar por campanha (opcional)' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL'], default: 'ALL' }
      },
      required: ['account_id']
    }
  },
  {
    name: 'create_adset',
    description: 'Cria um conjunto de anúncios com segmentação e orçamento.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        campaign_id: { type: 'string' },
        name: { type: 'string' },
        daily_budget: { type: 'number', description: 'Em centavos' },
        billing_event: { type: 'string', enum: ['IMPRESSIONS', 'LINK_CLICKS', 'APP_INSTALLS'], default: 'IMPRESSIONS' },
        optimization_goal: { type: 'string' },
        targeting: { type: 'object' },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], default: 'PAUSED' }
      },
      required: ['account_id', 'campaign_id', 'name', 'daily_budget', 'optimization_goal', 'targeting']
    }
  },
  {
    name: 'update_adset',
    description: 'Atualiza status, orçamento ou segmentação de um adset.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        adset_id: { type: 'string' },
        name: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'] },
        daily_budget: { type: 'number' },
        targeting: { type: 'object' }
      },
      required: ['account_id', 'adset_id']
    }
  },

  // ─── ANÚNCIOS ─────────────────────────────────────────
  {
    name: 'get_ads',
    description: 'Lista anúncios de uma conta, adset ou campanha. Use account_id diretamente.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        adset_id: { type: 'string', description: 'Filtrar por adset (opcional)' },
        campaign_id: { type: 'string', description: 'Filtrar por campanha (opcional)' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL'], default: 'ALL' }
      },
      required: ['account_id']
    }
  },
  {
    name: 'update_ad',
    description: 'Ativa, pausa ou arquiva um anúncio.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        ad_id: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'] },
        name: { type: 'string' }
      },
      required: ['account_id', 'ad_id']
    }
  },

  // ─── INSIGHTS ─────────────────────────────────────────
  {
    name: 'get_insights',
    description: 'Retorna métricas de performance (ROAS, CPC, CTR, spend, etc.). Use account_id diretamente. NÃO chame list_clients antes.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        level: { type: 'string', enum: ['account', 'campaign', 'adset', 'ad'], default: 'campaign' },
        object_id: { type: 'string', description: 'ID específico para filtrar (opcional)' },
        date_preset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last_3d', 'last_7d', 'last_14d', 'last_28d',
                 'last_30d', 'last_90d', 'this_month', 'last_month', 'this_quarter', 'last_year'],
          default: 'last_30d'
        },
        time_range: { type: 'object', description: '{ since: "2024-01-01", until: "2024-01-31" }' },
        breakdowns: { type: 'array', items: { type: 'string' } }
      },
      required: ['account_id']
    }
  },

  // ─── PÚBLICOS ─────────────────────────────────────────
  {
    name: 'get_audiences',
    description: 'Lista públicos personalizados e lookalikes. Use account_id diretamente.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' },
        type: { type: 'string', enum: ['custom', 'lookalike', 'all'], default: 'all' }
      },
      required: ['account_id']
    }
  },

  // ─── PIXELS ───────────────────────────────────────────
  {
    name: 'get_pixels',
    description: 'Lista pixels do Meta instalados na conta. Use account_id diretamente.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'ID da conta. Exemplo: act_949878915087001' },
        client: { type: 'string', description: 'Nome do cliente (opcional)' }
      },
      required: ['account_id']
    }
  }
];

// ─── HANDLERS ─────────────────────────────────────────────
export async function handleMetaAds(toolName, args) {
  const { client: clientName, account_id, ...params } = args;

  if (toolName === 'list_clients') {
    const clients = listClients();
    return { clients, total: clients.length };
  }

  const client = getClient();
  const accountId = resolveAccountId(clientName, account_id);
  const fields = {
    campaign: 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time',
    adset: 'id,name,status,campaign_id,daily_budget,optimization_goal,targeting,start_time,end_time',
    ad: 'id,name,status,adset_id,creative{id,name,thumbnail_url}',
    account: 'id,name,currency,account_status,balance,spend_cap,amount_spent'
  };

  switch (toolName) {

    case 'get_account_info':
      return client.get(`/${accountId}`, { fields: fields.account });

    case 'get_campaigns': {
      const p = { fields: fields.campaign, limit: params.limit || 25 };
      if (params.status && params.status !== 'ALL') {
        p.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [params.status] }]);
      }
      return client.get(`/${accountId}/campaigns`, p);
    }

    case 'create_campaign': {
      const body = {
        name: params.name,
        objective: params.objective,
        status: params.status || 'PAUSED',
        special_ad_categories: params.special_ad_categories || []
      };
      if (params.daily_budget) body.daily_budget = params.daily_budget;
      if (params.lifetime_budget) body.lifetime_budget = params.lifetime_budget;
      return client.post(`/${accountId}/campaigns`, body);
    }

    case 'update_campaign': {
      const body = {};
      if (params.name) body.name = params.name;
      if (params.status) body.status = params.status;
      if (params.daily_budget) body.daily_budget = params.daily_budget;
      if (params.lifetime_budget) body.lifetime_budget = params.lifetime_budget;
      return client.post(`/${params.campaign_id}`, body);
    }

    case 'get_adsets': {
      const p = { fields: fields.adset, limit: 50 };
      const filters = [];
      if (params.status && params.status !== 'ALL') {
        filters.push({ field: 'effective_status', operator: 'IN', value: [params.status] });
      }
      if (filters.length) p.filtering = JSON.stringify(filters);
      const endpoint = params.campaign_id ? `/${params.campaign_id}/adsets` : `/${accountId}/adsets`;
      return client.get(endpoint, p);
    }

    case 'create_adset': {
      const body = {
        campaign_id: params.campaign_id,
        name: params.name,
        daily_budget: params.daily_budget,
        billing_event: params.billing_event || 'IMPRESSIONS',
        optimization_goal: params.optimization_goal,
        targeting: params.targeting,
        status: params.status || 'PAUSED'
      };
      if (params.start_time) body.start_time = params.start_time;
      if (params.end_time) body.end_time = params.end_time;
      return client.post(`/${accountId}/adsets`, body);
    }

    case 'update_adset': {
      const body = {};
      if (params.name) body.name = params.name;
      if (params.status) body.status = params.status;
      if (params.daily_budget) body.daily_budget = params.daily_budget;
      if (params.targeting) body.targeting = params.targeting;
      return client.post(`/${params.adset_id}`, body);
    }

    case 'get_ads': {
      const p = { fields: fields.ad, limit: 50 };
      const filters = [];
      if (params.status && params.status !== 'ALL') {
        filters.push({ field: 'effective_status', operator: 'IN', value: [params.status] });
      }
      if (filters.length) p.filtering = JSON.stringify(filters);
      const endpoint = params.adset_id
        ? `/${params.adset_id}/ads`
        : params.campaign_id
          ? `/${params.campaign_id}/ads`
          : `/${accountId}/ads`;
      return client.get(endpoint, p);
    }

    case 'update_ad': {
      const body = {};
      if (params.status) body.status = params.status;
      if (params.name) body.name = params.name;
      return client.post(`/${params.ad_id}`, body);
    }

    case 'get_insights': {
      const insightFields = [
        'campaign_name', 'campaign_id', 'adset_name', 'adset_id', 'ad_name', 'ad_id',
        'impressions', 'reach', 'clicks', 'spend', 'ctr', 'cpc', 'cpm', 'cpp',
        'actions', 'action_values', 'frequency', 'unique_clicks',
        'cost_per_action_type', 'website_purchase_roas', 'conversions'
      ].join(',');

      const p = {
        fields: insightFields,
        level: params.level || 'campaign',
        limit: 500
      };

      // --- FILTRO NATIVO DE SPEND > 0 ---
      const filters = [
        { field: 'spend', operator: 'GREATER_THAN', value: 0 }
      ];

      // --- FILTRO NATIVO DE NOME (se enviado) ---
      if (params.filtering_name) {
        filters.push({
          field: 'campaign.name',
          operator: 'CONTAIN',
          value: params.filtering_name
        });
      }

      p.filtering = JSON.stringify(filters);

      if (params.time_range) {
        p.time_range = JSON.stringify(params.time_range);
      } else {
        p.date_preset = params.date_preset || 'last_30d';
      }

      if (params.breakdowns?.length) p.breakdowns = params.breakdowns.join(',');

      const endpoint = params.object_id ? `/${params.object_id}/insights` : `/${accountId}/insights`;

      // Seguir paginação com cursor até ter todos os resultados
      const allData = [];
      let after = null;
      do {
        const pageParams = after ? { ...p, after } : p;
        const response = await client.get(endpoint, pageParams);
        allData.push(...(response.data || []));
        after = response.paging?.cursors?.after && response.paging?.next
          ? response.paging.cursors.after
          : null;
      } while (after);

      return { data: allData, total: allData.length };
    }

    case 'get_audiences':
      return client.get(`/${accountId}/customaudiences`, {
        fields: 'id,name,subtype,approximate_count,time_created',
        limit: 50
      });

    case 'get_pixels':
      return client.get(`/${accountId}/adspixels`, {
        fields: 'id,name,code,usage,last_fired_time,is_unavailable'
      });

    default:
      throw new Error(`Tool desconhecida: ${toolName}`);
  }
}
