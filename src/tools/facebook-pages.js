// src/tools/facebook-pages.js
// Facebook Pages Insights via Graph API

import { resolveClient } from '../auth/meta-client.js';

export const facebookTools = [
  {
    name: 'get_fb_pages',
    description: 'Lista as páginas do Facebook vinculadas ao cliente',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' }
      },
      required: ['client']
    }
  },
  {
    name: 'get_fb_page_insights',
    description: 'Retorna métricas da página FB (alcance, curtidas, engajamento, impressões)',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        page_id: { type: 'string', description: 'ID da página FB (obtido via get_fb_pages)' },
        period: { type: 'string', enum: ['day', 'week', 'month', 'days_28'], default: 'month' },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          default: [
            'page_impressions', 'page_reach', 'page_engaged_users',
            'page_fans', 'page_fans_adds', 'page_post_engagements'
          ]
        }
      },
      required: ['client', 'page_id']
    }
  },
  {
    name: 'get_fb_page_posts',
    description: 'Lista publicações recentes da página com curtidas e comentários',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        page_id: { type: 'string' },
        limit: { type: 'number', default: 20 }
      },
      required: ['client', 'page_id']
    }
  },
  {
    name: 'get_fb_post_insights',
    description: 'Retorna métricas detalhadas de uma publicação específica da página',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        post_id: { type: 'string', description: 'ID do post (obtido via get_fb_page_posts)' }
      },
      required: ['client', 'post_id']
    }
  },
  {
    name: 'get_fb_page_fan_demographics',
    description: 'Retorna dados demográficos dos seguidores da página (idade, gênero, localização)',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        page_id: { type: 'string' }
      },
      required: ['client', 'page_id']
    }
  },
  {
    name: 'get_fb_page_video_insights',
    description: 'Retorna métricas de vídeos publicados na página',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        page_id: { type: 'string' },
        limit: { type: 'number', default: 10 }
      },
      required: ['client', 'page_id']
    }
  }
];

export async function handleFacebook(toolName, args) {
  const { client: clientName, ...params } = args;
  const { client } = resolveClient(clientName);

  switch (toolName) {

    case 'get_fb_pages':
      return client.get('/me/accounts', {
        fields: 'id,name,category,fan_count,followers_count,picture,website,about'
      });

    case 'get_fb_page_insights': {
      const metrics = (params.metrics || [
        'page_impressions', 'page_reach', 'page_engaged_users',
        'page_fans', 'page_fans_adds', 'page_post_engagements'
      ]).join(',');
      return client.get(`/${params.page_id}/insights`, {
        metric: metrics,
        period: params.period || 'month'
      });
    }

    case 'get_fb_page_posts':
      return client.get(`/${params.page_id}/posts`, {
        fields: 'id,message,story,created_time,likes.summary(true),comments.summary(true),shares,full_picture,permalink_url',
        limit: params.limit || 20
      });

    case 'get_fb_post_insights':
      return client.get(`/${params.post_id}/insights`, {
        metric: 'post_impressions,post_reach,post_engaged_users,post_clicks,post_reactions_by_type_total,post_video_views'
      });

    case 'get_fb_page_fan_demographics':
      return client.get(`/${params.page_id}/insights`, {
        metric: 'page_fans_city,page_fans_country,page_fans_gender_age,page_fans_locale',
        period: 'lifetime'
      });

    case 'get_fb_page_video_insights':
      return client.get(`/${params.page_id}/videos`, {
        fields: 'id,title,description,length,views,likes.summary(true),comments.summary(true),published,created_time',
        limit: params.limit || 10
      });

    default:
      throw new Error(`Tool do Facebook desconhecida: ${toolName}`);
  }
}
