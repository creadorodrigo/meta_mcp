# RC Performance — Meta MCP Server
## Guia Completo de Instalação e Uso

---

## 📁 Estrutura do Projeto

```
rc-meta-mcp/
├── src/
│   ├── index.js              ← Servidor principal (stdio + HTTP)
│   ├── auth/
│   │   └── meta-client.js    ← Cliente da Graph API
│   └── tools/
│       ├── meta-ads.js       ← Campanhas, Adsets, Anúncios, Insights
│       ├── media-library.js  ← Biblioteca de Mídias e Criativos
│       ├── instagram.js      ← Insights do Instagram
│       └── facebook-pages.js ← Insights de Páginas do Facebook
├── .env.example              ← Modelo do arquivo de configuração
├── setup-vps.sh              ← Script de deploy na VPS
└── package.json
```

---

## 🔧 ETAPA 1 — Deploy na VPS Hostinger

### 1.1 Conectar via SSH
```bash
ssh usuario@ip-da-sua-vps
```

### 1.2 Rodar o script de preparação
```bash
bash setup-vps.sh
```

### 1.3 Copiar arquivos para a VPS
Do seu PC Windows (use o PowerShell ou Git Bash):
```bash
scp -r ./rc-meta-mcp/* usuario@ip-da-vps:/home/usuario/rc-meta-mcp/
```

### 1.4 Configurar o .env com seus tokens
```bash
cd ~/rc-meta-mcp
nano .env
```
Preencha os tokens de cada cliente e a MCP_API_KEY (gere uma chave forte):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.5 Instalar dependências e iniciar
```bash
npm install
pm2 start src/index.js --name rc-meta-mcp
pm2 save
pm2 startup   # para iniciar automaticamente ao reiniciar a VPS
```

### 1.6 Verificar se está rodando
```bash
pm2 status
pm2 logs rc-meta-mcp

# Testar localmente na VPS:
curl http://localhost:3000/health
```

### 1.7 Abrir a porta no firewall (se necessário)
```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

---

## 💻 ETAPA 2 — Conectar ao Claude Desktop (Windows)

### 2.1 Instalar o Claude Desktop
Baixe em: https://claude.ai/download

### 2.2 Editar o arquivo de configuração
Abra o arquivo:
```
%APPDATA%\Claude\claude_desktop_config.json
```
No Windows: pressione `Win + R`, digite `%APPDATA%\Claude` e abra o arquivo.

### 2.3 Adicionar o MCP Server
```json
{
  "mcpServers": {
    "rc-meta": {
      "command": "node",
      "args": ["C:\\caminho\\para\\rc-meta-mcp\\src\\index.js"],
      "env": {
        "MCP_MODE": "stdio",
        "META_TOKEN_EDUCAMENTE": "seu_token",
        "META_TOKEN_MACOL": "seu_token",
        "META_TOKEN_CAGRAFICA": "seu_token",
        "META_TOKEN_ARTTURI": "seu_token",
        "META_TOKEN_KOMPRAO": "seu_token",
        "META_TOKEN_GRUPOKOCH": "seu_token",
        "META_ACCOUNT_EDUCAMENTE": "act_949878915087001",
        "META_ACCOUNT_MACOL": "act_292837162418813",
        "META_ACCOUNT_CAGRAFICA": "act_394946033434050",
        "META_ACCOUNT_ARTTURI": "act_1469464700763090",
        "META_ACCOUNT_KOMPRAO": "act_629543477400726",
        "META_ACCOUNT_GRUPOKOCH": "act_843273593952142",
        "META_API_VERSION": "v19.0"
      }
    }
  }
}
```

> **Alternativa (recomendada):** Use o servidor HTTP da VPS no Claude Desktop:
> Vá em Settings > Connectors > Add Custom Connector
> URL: `http://ip-da-vps:3000/mcp`
> Header: `x-api-key: sua_chave`

### 2.4 Reiniciar o Claude Desktop
Feche e abra o Claude Desktop. O ícone do MCP deve aparecer.

---

## 🔌 ETAPA 3 — Integração com Sistema Interno (SAAS)

### Chamar uma tool via HTTP POST
```javascript
// Exemplo: buscar campanhas ativas da Educamente
const response = await fetch('http://ip-da-vps:3000/tools/get_campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'sua_chave_mcp'
  },
  body: JSON.stringify({
    client: 'educamente',
    status: 'ACTIVE'
  })
});

const data = await response.json();
console.log(data);
```

### Exemplo com insights
```javascript
const insights = await fetch('http://ip-da-vps:3000/tools/get_insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'sua_chave_mcp'
  },
  body: JSON.stringify({
    client: 'macol',
    level: 'campaign',
    date_preset: 'last_30d'
  })
});
```

---

## 📲 ETAPA 4 — Integração com N8N (WhatsApp)

No N8N, use o nó **HTTP Request**:
- **Method:** POST
- **URL:** `http://ip-da-vps:3000/tools/get_insights`
- **Headers:** `x-api-key: sua_chave`
- **Body (JSON):**
```json
{
  "client": "{{ $json.cliente }}",
  "level": "campaign",
  "date_preset": "last_30d"
}
```

---

## 🛠️ Ferramentas Disponíveis

### Meta Ads (14 tools)
| Tool | Descrição |
|------|-----------|
| `list_clients` | Lista clientes configurados |
| `get_account_info` | Info da conta (saldo, status) |
| `get_campaigns` | Listar campanhas |
| `create_campaign` | Criar campanha |
| `update_campaign` | Editar/pausar/ativar campanha |
| `get_adsets` | Listar adsets |
| `create_adset` | Criar adset com segmentação |
| `update_adset` | Editar adset |
| `get_ads` | Listar anúncios |
| `update_ad` | Editar anúncio |
| `get_insights` | Métricas (ROAS, CPC, CTR...) |
| `get_audiences` | Públicos personalizados |
| `get_pixels` | Pixels da conta |

### Biblioteca de Mídias (5 tools)
| Tool | Descrição |
|------|-----------|
| `get_ad_images` | Imagens da biblioteca |
| `get_ad_videos` | Vídeos da biblioteca |
| `get_ad_creatives` | Criativos completos |
| `get_creative_details` | Detalhes de um criativo |
| `get_creative_insights` | Performance por criativo |

### Instagram (6 tools)
| Tool | Descrição |
|------|-----------|
| `get_ig_accounts` | Contas IG vinculadas |
| `get_ig_account_insights` | Métricas da conta |
| `get_ig_media` | Posts e reels |
| `get_ig_media_insights` | Métricas de um post |
| `get_ig_audience_insights` | Dados demográficos |
| `get_ig_stories` | Stories ativos |

### Facebook Pages (6 tools)
| Tool | Descrição |
|------|-----------|
| `get_fb_pages` | Páginas vinculadas |
| `get_fb_page_insights` | Métricas da página |
| `get_fb_page_posts` | Publicações recentes |
| `get_fb_post_insights` | Métricas de um post |
| `get_fb_page_fan_demographics` | Dados demográficos dos fãs |
| `get_fb_page_video_insights` | Métricas de vídeos |

---

## 🆘 Problemas Comuns

### MCP não aparece no Claude Desktop
- Verifique se o JSON do config é válido (use jsonlint.com)
- Confirme que o Node.js está instalado: `node --version`
- Reinicie o Claude Desktop completamente

### Erro de token do Meta
- Confirme que o System User Token tem as permissões corretas
- Tokens de usuário comum expiram — use sempre System User Token
- Permissões necessárias: `ads_read`, `ads_management`, `business_management`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `read_insights`

### VPS não responde
- Verifique se a porta 3000 está aberta: `sudo ufw status`
- Confirme que o PM2 está rodando: `pm2 status`
- Veja os logs: `pm2 logs rc-meta-mcp`
