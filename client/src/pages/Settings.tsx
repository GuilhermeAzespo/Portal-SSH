import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, DownloadCloud, CheckCircle, XCircle, RefreshCw, Layers } from 'lucide-react';
import pkg from '../../package.json'; // Reading version locally

export const Settings = () => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorCheck, setErrorCheck] = useState<string | null>(null);

  const currentVersion = pkg.version;

  const checkForUpdates = async () => {
    setIsChecking(true);
    setErrorCheck(null);
    try {
      const res = await fetch('https://api.github.com/repos/GuilhermeAzespo/Portal-SSH/tags');
      if (!res.ok) throw new Error('Não foi possível conectar ao GitHub');
      const tags = await res.json();
      
      if (tags && tags.length > 0) {
        const latestTag = tags[0].name.replace('v', '');
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

  const handleUpdate = async () => {
    if (!confirm('Tem certeza que deseja aplicar a atualização agora? O sistema ficará offline por alguns instantes durante o reinício dos containers.')) return;
    
    setIsUpdating(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch('/api/update/trigger', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        // The server will restart soon. We show a message and wait correctly.
        setTimeout(() => {
          window.location.reload();
        }, 60000); // 60 seconds wait for rebuild/restart
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao iniciar atualização');
        setIsUpdating(false);
      }
    } catch (e) {
      // Catching the error is expected as the server closes the connection to restart
      console.log('Update triggered, waiting for restart...');
      setTimeout(() => {
        window.location.reload();
      }, 60000);
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

      <div style={{ gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '800px', display: 'grid' }}>
          
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

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="button"
                  onClick={checkForUpdates}
                  disabled={isChecking || isUpdating}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {isChecking ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />}
                  Procurar
                </button>

                {!isUpToDate && latestVersion && (
                  <button 
                    className="button"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    {isUpdating ? <RefreshCw size={16} className="spin" /> : <DownloadCloud size={16} />}
                    {isUpdating ? 'Atualizando...' : 'Atualizar Agora'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              {isChecking && <div style={{ color: 'var(--text-muted)' }}>Consultando servidores da nuvem...</div>}
              {isUpdating && (
                <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <RefreshCw size={20} className="spin" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Atualização em Progresso</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>O servidor está baixando os arquivos e reiniciando o serviço Docker. Por favor, aguarde cerca de 30 segundos sem fechar esta aba.</div>
                  </div>
                </div>
              )}
              
              {!isChecking && errorCheck && (
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={18} /> {errorCheck}
                </div>
              )}

              {!isChecking && !isUpdating && latestVersion && (
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
                      <span>Excelente! Sua infraestrutura está rodando a última versão disponível. (v{latestVersion}).</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={20} />
                      <div>
                        <strong>Nova versão disponível: v{latestVersion}</strong>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                          Clique no botão "Atualizar Agora" acima para aplicar as correções automáticas via O.T.A.
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
