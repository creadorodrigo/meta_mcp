// src/tools/instagram.js
// Instagram Insights via Graph API

import { getClient } from '../auth/meta-client.js';

export const instagramTools = [
  {
    name: 'get_ig_accounts',
    description: 'Lista contas do Instagram vinculadas às páginas do cliente',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' }
      },
      required: ['client']
    }
  },
  {
    name: 'get_ig_account_insights',
    description: 'Retorna métricas da conta IG (alcance, impressões, seguidores, perfil visitado)',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        ig_account_id: { type: 'string', description: 'ID da conta IG (obtido via get_ig_accounts)' },
        period: { type: 'string', enum: ['day', 'week', 'month', 'days_28'], default: 'month' },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          default: ['impressions', 'reach', 'profile_views', 'website_clicks', 'follower_count'],
          description: 'Métricas disponíveis: impressions, reach, profile_views, website_clicks, follower_count, accounts_engaged'
        }
      },
      required: ['client', 'ig_account_id']
    }
  },
  {
    name: 'get_ig_media',
    description: 'Lista posts, reels e stories do Instagram com métricas básicas',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        ig_account_id: { type: 'string' },
        media_type: { type: 'string', enum: ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL', 'ALL'], default: 'ALL' },
        limit: { type: 'number', default: 20 }
      },
      required: ['client', 'ig_account_id']
    }
  },
  {
    name: 'get_ig_media_insights',
    description: 'Retorna métricas detalhadas de um post ou reel específico do Instagram',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        media_id: { type: 'string', description: 'ID do post/reel (obtido via get_ig_media)' }
      },
      required: ['client', 'media_id']
    }
  },
  {
    name: 'get_ig_audience_insights',
    description: 'Retorna dados demográficos da audiência IG (idade, gênero, cidade, país)',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        ig_account_id: { type: 'string' }
      },
      required: ['client', 'ig_account_id']
    }
  },
  {
    name: 'get_ig_stories',
    description: 'Lista stories ativos do Instagram com visualizações e interações',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        ig_account_id: { type: 'string' }
      },
      required: ['client', 'ig_account_id']
    }
  }
];

export async function handleInstagram(toolName, args) {
  const { client: clientName, ...params } = args;
  const client = getClient();

  switch (toolName) {

    case 'get_ig_accounts': {
      // Busca páginas FB e depois as contas IG vinculadas
      const pages = await client.get('/me/accounts', {
        fields: 'id,name,instagram_business_account{id,name,username,profile_picture_url,followers_count,biography}'
      });
      return pages;
    }

    case 'get_ig_account_insights': {
      const metrics = (params.metrics || ['impressions', 'reach', 'profile_views', 'follower_count']).join(',');
      return client.get(`/${params.ig_account_id}/insights`, {
        metric: metrics,
        period: params.period || 'month'
      });
    }

    case 'get_ig_media': {
      const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
      const p = { fields, limit: params.limit || 20 };
      if (params.media_type && params.media_type !== 'ALL') {
        p.media_type = params.media_type;
      }
      return client.get(`/${params.ig_account_id}/media`, p);
    }

    case 'get_ig_media_insights': {
      // Métricas para posts estáticos e reels
      const metrics = 'impressions,reach,likes,comments,saved,shares,plays,total_interactions,profile_visits,follows';
      return client.get(`/${params.media_id}/insights`, {
        metric: metrics
      });
    }

    case 'get_ig_audience_insights': {
      const metrics = 'audience_city,audience_country,audience_gender_age,audience_locale';
      return client.get(`/${params.ig_account_id}/insights`, {
        metric: metrics,
        period: 'lifetime'
      });
    }

    case 'get_ig_stories': {
      return client.get(`/${params.ig_account_id}/stories`, {
        fields: 'id,caption,media_type,media_url,timestamp'
      });
    }

    default:
      throw new Error(`Tool do Instagram desconhecida: ${toolName}`);
  }
}
