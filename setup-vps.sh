#!/bin/bash
# ============================================================
# RC Performance — Deploy do MCP Server na VPS Hostinger
# Execute este script na sua VPS via SSH
# ============================================================

set -e

echo "🚀 RC Performance Meta MCP — Deploy na VPS"
echo "============================================"

# ── 1. Atualizar sistema ──
echo "📦 Atualizando sistema..."
sudo apt update -y && sudo apt upgrade -y

# ── 2. Instalar Node.js 20 LTS ──
echo "📦 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "✅ Node.js $(node --version)"
echo "✅ NPM $(npm --version)"

# ── 3. Instalar PM2 (processo em background) ──
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# ── 4. Criar pasta do projeto ──
echo "📁 Criando pasta do projeto..."
mkdir -p /home/$USER/rc-meta-mcp
cd /home/$USER/rc-meta-mcp

# ── 5. Copiar arquivos do projeto ──
# (após rodar este script, copie os arquivos manualmente via SCP ou Git)
echo ""
echo "⚠️  PRÓXIMO PASSO: Copie os arquivos do projeto para:"
echo "    /home/$USER/rc-meta-mcp/"
echo ""
echo "Opção A — via SCP (do seu PC local):"
echo "  scp -r ./rc-meta-mcp/* usuario@ip-da-vps:/home/usuario/rc-meta-mcp/"
echo ""
echo "Opção B — via Git (recomendado):"
echo "  git clone https://github.com/seu-usuario/rc-meta-mcp.git ."
echo ""

# ── 6. Criar arquivo .env ──
if [ ! -f .env ]; then
  echo "📝 Criando arquivo .env..."
  cat > .env << 'EOF'
# ============================================
# RC Performance — Meta MCP Server
# ============================================
PORT=3000
MCP_MODE=http
MCP_API_KEY=SUBSTITUA_POR_UMA_CHAVE_FORTE

# Tokens dos clientes
META_TOKEN_EDUCAMENTE=
META_TOKEN_MACOL=
META_TOKEN_CAGRAFICA=
META_TOKEN_ARTTURI=
META_TOKEN_KOMPRAO=
META_TOKEN_GRUPOKOCH=

# IDs das contas
META_ACCOUNT_EDUCAMENTE=act_949878915087001
META_ACCOUNT_MACOL=act_292837162418813
META_ACCOUNT_CAGRAFICA=act_394946033434050
META_ACCOUNT_ARTTURI=act_1469464700763090
META_ACCOUNT_KOMPRAO=act_629543477400726
META_ACCOUNT_GRUPOKOCH=act_843273593952142

META_API_VERSION=v19.0
EOF
  echo "✅ .env criado — EDITE com seus tokens antes de continuar!"
  echo "   nano /home/$USER/rc-meta-mcp/.env"
fi

echo ""
echo "============================================"
echo "✅ Preparação concluída!"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Copie os arquivos do projeto para a VPS"
echo "2. Edite o .env com seus tokens: nano .env"
echo "3. Instale dependências: npm install"
echo "4. Inicie com PM2: pm2 start src/index.js --name rc-meta-mcp"
echo "5. Salve o PM2: pm2 save && pm2 startup"
echo "============================================"
