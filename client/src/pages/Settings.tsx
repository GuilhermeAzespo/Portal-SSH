import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, DownloadCloud, CheckCircle, XCircle, RefreshCw, Layers, Terminal } from 'lucide-react';
import pkg from '../../package.json';

export const Settings = () => {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorCheck, setErrorCheck] = useState<string | null>(null);
  const [updateLog, setUpdateLog] = useState<string>('');
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Poll /api/update/status and inspect the log content.
  // Only reloads when the log contains the 'update done' marker,
  // preventing false-positives from the server responding BEFORE it restarts.
  const startPollingForRestart = () => {
    let attempts = 0;
    const maxAttempts = 60; // 60 × 5s = 5 min max
    const token = localStorage.getItem('token');
    const startedAt = Date.now();

    pollRef.current = setInterval(async () => {
      attempts++;
      setUpdateLog(`⏳ Aguardando rebuild dos containers... (${Math.floor((Date.now() - startedAt) / 1000)}s)`);

      try {
        const res = await fetch('/api/update/status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(4000)
        });

        if (res.ok) {
          const data = await res.json();
          const log: string = data.log || '';

          if (log.includes('update done')) {
            // Build finished and containers restarted successfully
            clearInterval(pollRef.current!);
            clearInterval(countdownRef.current!);
            setUpdateLog('✅ Atualização concluída! Recarregando...');
            setTimeout(() => window.location.reload(), 2000);
          } else if (log.includes('error') || log.includes('Error') || log.includes('failed')) {
            clearInterval(pollRef.current!);
            clearInterval(countdownRef.current!);
            setIsUpdating(false);
            setUpdateLog('❌ Erro durante o build. Verifique o log no servidor: /app/db_data/update.log');
          }
          // Otherwise: still building, keep polling
        }
      } catch {
        // Network error = server temporarily offline (swapping containers)
        setUpdateLog('🔄 Servidor reiniciando containers... aguardando voltar online.');
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current!);
        clearInterval(countdownRef.current!);
        setIsUpdating(false);
        setUpdateLog('⚠️ Tempo limite excedido. Verifique: docker logs portal-ssh-server-1');
      }
    }, 5000);
  };


  const handleUpdate = async () => {
    if (!confirm('Tem certeza que deseja aplicar a atualização agora? O sistema ficará offline por alguns instantes durante o reinício dos containers.')) return;

    setIsUpdating(true);
    setUpdateLog('🚀 Enviando comando de atualização ao servidor...');
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/update/trigger', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setUpdateLog('✅ Comando recebido! O servidor está fazendo git pull e rebuilding containers...');
        
        // Wait 10s then start polling for restart
        setTimeout(() => {
          setUpdateLog('⏳ Containers sendo reconstruídos. Isso pode levar 1-3 minutos...');
          startPollingForRestart();
        }, 10000);

        // Countdown for UX feedback
        let secs = 120;
        setCountdown(secs);
        countdownRef.current = setInterval(() => {
          secs--;
          setCountdown(secs);
          if (secs <= 0) clearInterval(countdownRef.current!);
        }, 1000);

      } else {
        const data = await res.json();
        setIsUpdating(false);
        setUpdateLog('');
        setErrorCheck(data.error || 'Erro ao iniciar atualização');
      }
    } catch {
      // Connection dropped — server is restarting, start polling
      setUpdateLog('🔄 Conexão encerrada (servidor reiniciando). Verificando quando voltar online...');
      setTimeout(() => startPollingForRestart(), 8000);
    }
  };

  useEffect(() => {
    checkForUpdates();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const isUpToDate = latestVersion && (latestVersion === currentVersion);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <div className="page-header">
        <h1 className="page-title">
          <SettingsIcon size={26} />
          Atualizações do Sistema
        </h1>
      </div>

      <div style={{ gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '800px', display: 'grid' }}>
        <div className="card glass">
          <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
            <DownloadCloud size={18} color="var(--primary)" /> Versionamento O.T.A
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Verifique o ciclo de vida da plataforma comparando seu lançamento atual diretamente com o repositório matriz de nuvem pública.
          </p>

          {/* Version + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface-2)', padding: '1.25rem 1.5rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                Versão instalada
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                v{currentVersion}
                <Layers size={16} color="var(--text-muted)" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="button button-outline"
                onClick={checkForUpdates}
                disabled={isChecking || isUpdating}
              >
                {isChecking ? <RefreshCw size={15} className="spin" /> : <RefreshCw size={15} />}
                Procurar
              </button>

              {!isUpToDate && latestVersion && (
                <button
                  className="button"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? <RefreshCw size={15} className="spin" /> : <DownloadCloud size={15} />}
                  {isUpdating ? `Atualizando... ${countdown > 0 ? `(${countdown}s)` : ''}` : 'Atualizar Agora'}
                </button>
              )}
            </div>
          </div>

          {/* Status messages */}
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isChecking && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={14} className="spin" /> Consultando servidores da nuvem...
              </div>
            )}

            {isUpdating && updateLog && (
              <div style={{
                background: 'var(--primary-glow)',
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid var(--primary-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <RefreshCw size={16} className="spin" />
                  Atualização em Progresso
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                  {updateLog}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                  <Terminal size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Não feche esta aba. O sistema voltará online automaticamente após o rebuild.
                </div>
              </div>
            )}

            {!isChecking && errorCheck && (
              <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', background: 'var(--danger-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>
                <XCircle size={16} /> {errorCheck}
              </div>
            )}

            {!isChecking && !isUpdating && latestVersion && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1rem',
                borderRadius: '8px',
                background: isUpToDate ? 'var(--success-bg)' : 'var(--warning-bg)',
                color: isUpToDate ? 'var(--success)' : 'var(--warning)',
                border: `1px solid ${isUpToDate ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.2)'}`,
                fontSize: '0.875rem',
              }}>
                {isUpToDate ? (
                  <>
                    <CheckCircle size={18} />
                    <span>Excelente! Infraestrutura rodando a última versão disponível. <strong>v{latestVersion}</strong></span>
                  </>
                ) : (
                  <>
                    <DownloadCloud size={18} />
                    <div>
                      <strong>Nova versão disponível: v{latestVersion}</strong>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                        Clique em "Atualizar Agora" para aplicar as correções automáticas via O.T.A.
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
