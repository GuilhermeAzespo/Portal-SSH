# Portal-SSH
Portal de acesso SSH via web

---

## Deploy em um servidor Linux novo

### Pre-requisitos

| Dependencia | Por que |
|---|---|
| Git | Para clonar o repositorio |
| Docker | Para buildar e rodar os containers |
| Docker Compose | Para orquestrar os servicos (client + server) |

---

### Passo a passo

**1. Instalar dependencias (Ubuntu/Debian)**
```bash
sudo apt update && sudo apt upgrade -y

# Git
sudo apt install -y git

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin
sudo apt install -y docker-compose-plugin
```

**2. Clonar o repositorio**
```bash
git clone https://github.com/GuilhermeAzespo/Portal-SSH.git
cd Portal-SSH
```

**3. Configurar o segredo JWT**

Antes de subir, edite o docker-compose.yml e troque o valor padrao do JWT_SECRET por uma chave aleatoria forte:

```bash
# Gerar uma chave segura:
openssl rand -hex 32
```

Edite no docker-compose.yml:
```yaml
environment:
  - JWT_SECRET=<sua_chave_gerada_aqui>
```

**4. Subir os servicos**
```bash
docker compose up -d --build
```

**5. Verificar se esta rodando**
```bash
docker compose ps
docker compose logs -f
```

---

### Acessar

| Servico | Porta |
|---|---|
| Frontend (cliente) | http://<IP-DO-SERVIDOR>:80 |
| Backend (API) | http://<IP-DO-SERVIDOR>:4000 |

---

### Pontos de atencao

- Firewall: Abra as portas 80 e 4000:
-   ```bash
      sudo ufw allow 80/tcp
      sudo ufw allow 4000/tcp
      ```
    - Docker Socket: O container do server monta /var/run/docker.sock - isso da acesso privilegiado ao host. Nao exponha o servidor publicamente sem autenticacao.
    - - JWT_SECRET: Nunca use o valor padrao em producao!
      - - Persistencia: O banco SQLite fica num volume Docker (sqlite_data), os dados sobrevivem a restarts e atualizacoes.
        - 
