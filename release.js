const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'GuilhermeAzespo/Portal-SSH';
const VERSION = '3.1.0';

async function createRelease() {
  console.log(`--- Iniciando processo de release v${VERSION} ---`);

  // 1. Atualizar versões nos arquivos package.json
  const paths = ['./client/package.json', './server/package.json'];
  paths.forEach(p => {
    if (fs.existsSync(p)) {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
      pkg.version = VERSION;
      fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Atualizado ${p} para v${VERSION}`);
    }
  });

  // 2. Comandos Git
  try {
    console.log('Commitando e criando tag...');
    execSync('git add .');
    execSync(`git commit -m "fix(pcap): properly parse linux sll and vlan link-layer headers"`);
    execSync(`git tag -a v${VERSION} -m "Release v${VERSION}"`);
    
    console.log('Configurando autenticação remota...');
    const remoteUrl = `https://${TOKEN}@github.com/${REPO}.git`;
    execSync(`git remote set-url origin ${remoteUrl}`);

    console.log('Pushing para o GitHub (main e tags)...');
    execSync('git push origin main');
    execSync(`git push origin v${VERSION}`);
  } catch (e) {
    console.warn('Alerta Git ou Tag já existente. Continuando para API...');
    console.error((e.stdout && e.stdout.toString()) || e.message);
  }

  // 3. Criar Release no GitHub via API (usando curl para evitar dependências extras de runtime no script)
  console.log('Criando Release oficial no GitHub...');
  const releaseData = {
    tag_name: `v${VERSION}`,
    name: `v${VERSION} - PCAP Parsing Accuracy`,
    body: `## Portal SSH v3.1.0 - PCAP Parsing Accuracy\n\nEste release foca em corrigir problemas de offset que causavam com que o Explorador de Fluxos deixasse de exibir os fluxos devido a falsos positivos em capturas geradas no modo Linux "any" interface.\n\n### Correções:\n- **Parser**: Suporte a leitura correta de offsets IP provenientes de capturas SLL (Linux Cooked Capture), Null Loopback e Headers VLAN, garantindo que portas e fluxos originais sejam mantidos pela IA.`,
    draft: false,
    prerelease: false
  };

  const curlCmd = `curl -X POST -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/${REPO}/releases -d '${JSON.stringify(releaseData).replace(/'/g, "'\\''")}'`;

  try {
    const response = execSync(curlCmd).toString();
    const jsonRes = JSON.parse(response);
    if (jsonRes.html_url) {
      console.log(`\n✅ Release criado com sucesso: ${jsonRes.html_url}`);
    } else {
      console.error('\n❌ Erro ao criar release:', jsonRes.message || response);
    }
  } catch (e) {
    console.error('Erro na execução do curl:', e.message);
  }
}

createRelease();
