// src/tools/media-library.js
// Biblioteca de Mídias do Meta (imagens e vídeos dos criativos)

import { getClient, resolveAccountId } from '../auth/meta-client.js';

export const mediaTools = [
  {
    name: 'get_ad_images',
    description: 'Lista imagens da biblioteca de criativos da conta',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        limit: { type: 'number', default: 25 }
      },
      required: ['client']
    }
  },
  {
    name: 'get_ad_videos',
    description: 'Lista vídeos da biblioteca de criativos da conta',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        limit: { type: 'number', default: 25 }
      },
      required: ['client']
    }
  },
  {
    name: 'get_ad_creatives',
    description: 'Lista criativos (combinação de imagem/vídeo + copy) usados nos anúncios',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        limit: { type: 'number', default: 25 }
      },
      required: ['client']
    }
  },
  {
    name: 'get_creative_details',
    description: 'Retorna detalhes completos de um criativo específico',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        creative_id: { type: 'string' }
      },
      required: ['client', 'creative_id']
    }
  },
  {
    name: 'get_creative_insights',
    description: 'Retorna métricas de performance por criativo para identificar os melhores',
    inputSchema: {
      type: 'object',
      properties: {
        client: { type: 'string' },
        date_preset: {
          type: 'string',
          enum: ['last_7d', 'last_14d', 'last_30d', 'last_month', 'this_month'],
          default: 'last_30d'
        },
        limit: { type: 'number', default: 20 }
      },
      required: ['client']
    }
  }
];

export async function handleMedia(toolName, args) {
  const { client: clientName, ...params } = args;
  const client = getClient();
  const accountId = resolveAccountId(clientName);

  switch (toolName) {

    case 'get_ad_images':
      return client.get(`/${accountId}/adimages`, {
        fields: 'hash,name,url,url_128,width,height,created_time,updated_time',
        limit: params.limit || 25
      });

    case 'get_ad_videos':
      return client.get(`/${accountId}/advideos`, {
        fields: 'id,title,description,thumbnails,length,created_time,updated_time,picture',
        limit: params.limit || 25
      });

    case 'get_ad_creatives':
      return client.get(`/${accountId}/adcreatives`, {
        fields: 'id,name,title,body,image_url,thumbnail_url,object_type,status,call_to_action_type',
        limit: params.limit || 25
      });

    case 'get_creative_details':
      return client.get(`/${params.creative_id}`, {
        fields: 'id,name,title,body,image_url,thumbnail_url,object_story_spec,call_to_action_type,object_type,status'
      });

    case 'get_creative_insights':
      return client.get(`/${accountId}/insights`, {
        fields: 'ad_id,ad_name,impressions,reach,clicks,spend,ctr,cpc,actions,action_values,website_purchase_roas',
        level: 'ad',
        date_preset: params.date_preset || 'last_30d',
        sort: ['spend_descending'],
        limit: params.limit || 20
      });

    default:
      throw new Error(`Tool de mídia desconhecida: ${toolName}`);
  }
}
