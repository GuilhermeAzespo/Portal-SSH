import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, DownloadCloud, CheckCircle, XCircle, RefreshCw, Layers } from 'lucide-react';
import pkg from '../../package.json'; // Reading version locally

export const Settings = () => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errorCheck, setErrorCheck] = useState<string | null>(null);

  const currentVersion = pkg.version;

  const checkForUpdates = async () => {
    setIsChecking(true);
    setErrorCheck(null);
    try {
      // Fetch Github API for the latest tag
      const res = await fetch('https://api.github.com/repos/GuilhermeAzespo/Portal-SSH/tags');
      if (!res.ok) throw new Error('Não foi possível conectar ao GitHub');
      const tags = await res.json();
      
      if (tags && tags.length > 0) {
        // Assume the first tag is the latest chronologically 
        const latestTag = tags[0].name.replace('v', ''); // remove logic 'v' like v1.0.0
        setLatestVersion(latestTag);
      } else {
        setErrorCheck('Nenhuma versão de lançamento encontrada no repositório.');
      }
    } catch (e: any) {
      setErrorCheck(e.message);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  const isUpToDate = latestVersion && (latestVersion === currentVersion);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
          <SettingsIcon size={28} color="var(--primary)" /> Atualizações do Sistema
        </h1>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
          
          <div className="card glass">
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DownloadCloud size={20} color="var(--primary)" /> Versionamento O.T.A
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Verifique o ciclo de vida da plataforma comparando seu lançamento atual diretamente com o repositório matriz de nuvem pública.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Versão Atual instalada</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  v{currentVersion}
                  <Layers size={18} color="var(--text-muted)" />
                </div>
              </div>

              <div>
                <button 
                  className="button"
                  onClick={checkForUpdates}
                  disabled={isChecking}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isChecking ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />}
                  Procurar Atualizações
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {isChecking && <div style={{ color: 'var(--text-muted)' }}>Consultando servidores da nuvem...</div>}
              
              {!isChecking && errorCheck && (
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={18} /> {errorCheck}
                </div>
              )}

              {!isChecking && latestVersion && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '1rem',
                  borderRadius: '8px',
                  background: isUpToDate ? 'rgba(74, 222, 128, 0.1)' : 'rgba(250, 204, 21, 0.1)',
                  color: isUpToDate ? '#4ade80' : '#facc15'
                }}>
                  {isUpToDate ? (
                    <>
                      <CheckCircle size={20} />
                      <span>Excelente! Sua infraestrutura está rodando a última versão estável disponível. (v{latestVersion}).</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={20} />
                      <div>
                        <strong>Nova versão disponível: v{latestVersion}</strong>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                          Para aplicar as correções, execute <code>git pull && docker-compose restart</code> em seu terminal mestre.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
        </div>

    </div>
  );
};
