import { useState } from 'react';
import axios from 'axios';
import { Upload, FileSearch, Loader2, Network, Cpu, CheckCircle2, AlertCircle, FileText, Database } from 'lucide-react';

export default function PcapAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.pcap') || droppedFile.name.endsWith('.pcapng')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Arquivo inválido. Por favor envie um arquivo .pcap ou .pcapng');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    setStatusText('Enviando arquivo para o núcleo...');

    const formData = new FormData();
    formData.append('pcap', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/pcap/analyze', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        timeout: 120000, // 2-min timeout para toda a rotação
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            if (percentCompleted === 100) {
              setStatusText('Digerindo protocolos (isso pode levar uns segundos)...');
            } else {
              setStatusText(`Enviando tráfego... ${percentCompleted}%`);
            }
          }
        }
      });
      setResult(response.data);
    } catch (err: any) {
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
         setError('Erro de Rede. Se o arquivo for muito grande, Nginx pode ter bloqueado (client_max_body_size). Tente um arquivo menor.');
      } else if (err.code === 'ECONNABORTED') {
         setError('Tempo limite esgotado. A análise da IA demorou mais que o esperado (Rate Limit do OpenRouter).');
      } else {
         const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Falha profunda ao processar. Verifique os logs do servidor ou sua chave de IA.';
         setError(errorMsg);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="main-content fade-in">
      <header className="page-header">
        <h1 className="page-title">
          <Network size={28} />
          Analisador de Tráfego AI (PCAP)
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Diagnóstico profundo de protocolos SIP, RTP e HTTP com inteligência artificial generativa.
        </p>
      </header>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        
        {/* Upload Section */}
        <div className={`card glass ${loading && uploadProgress === 100 ? 'pulse' : ''}`}>
          <div className="card-header" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--primary-glow)', padding: '6px', borderRadius: '6px' }}>
              <Upload size={18} color="var(--primary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Captura de Tráfego</h3>
          </div>
          
          <div className="card-body">
            <div 
              className={`upload-zone ${dragActive ? 'active' : ''}`}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-medium)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                backgroundColor: dragActive ? 'rgba(0, 212, 170, 0.05)' : 'rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('pcap-upload')?.click()}
            >
              <div style={{ position: 'relative', zIndex: 1, pointerEvents: loading ? 'none' : 'auto' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: 'var(--bg-surface-3)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  border: '1px solid var(--border-medium)',
                  boxShadow: dragActive ? '0 0 20px var(--primary-glow)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  {file ? <FileText size={32} color="var(--primary)" /> : <Upload size={32} color="var(--text-subtle)" />}
                </div>
                <input 
                  id="pcap-upload" 
                  type="file" 
                  accept=".pcap,.pcapng" 
                  hidden 
                  onChange={handleFileChange} 
                  disabled={loading}
                />
                <p style={{ fontWeight: 600, fontSize: '0.95rem', color: file ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {file ? file.name : 'Clique ou arraste seu arquivo .pcap aqui'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '8px' }}>
                  Máximo recomendado via web: 10MB (Standard PCAP)
                </p>
              </div>
              
              {dragActive && (
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--primary)', borderRadius: 'var(--radius-lg)', animation: 'glow-pulse 1.5s infinite' }}></div>
              )}
            </div>

            {loading && uploadProgress < 100 && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '6px' }}>
                  <span>Upload progresso...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--primary)', width: `${uploadProgress}%`, transition: 'width 0.2s ease-out' }}></div>
                </div>
              </div>
            )}

            <button 
              className="button" 
              style={{ width: '100%', marginTop: '2rem', height: '48px' }}
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? <Loader2 className="spin" size={20} /> : <FileSearch size={20} />}
              {loading ? statusText : 'Descodificar e Analisar'}
            </button>

            {error && (
              <div className="fade-in" style={{ 
                marginTop: '1.25rem', 
                padding: '1.25rem', 
                background: 'rgba(248, 113, 113, 0.05)', 
                border: '1px solid rgba(248, 113, 113, 0.2)', 
                borderRadius: 'var(--radius-lg)', 
                color: 'var(--danger)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 600 }}>Erro no Processamento</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', opacity: 0.9 }}>{error}</p>
                    
                    {/* Troubleshooting Tips */}
                    {(error.includes('Chave') || error.includes('OpenRouter')) && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', borderLeft: '2px solid var(--danger)' }}>
                        <strong>Dica:</strong> Verifique se sua chave API está correta em <em>Configurações {'>'} Inteligência Artificial</em> e se você possui saldo disponível no OpenRouter.
                      </div>
                    )}
                    
                    {(error.includes('Timeout') || error.includes('Tempo limite')) && (
                      <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', borderLeft: '2px solid var(--warning)' }}>
                        <strong>Dica:</strong> Arquivos muito grandes podem demorar para serem processados pela IA. Tente segmentar o PCAP em fatias menores ou aguarde alguns minutos antes de tentar novamente.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="card glass fade-in" style={{ borderLeft: '3px solid var(--success)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '6px' }}>
                  <CheckCircle2 size={18} color="var(--success)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Diagnóstico da IA</h3>
              </div>
              <span className="badge badge-primary">OpenRouter Analyser</span>
            </div>
            
            <div className="card-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="section-title">Distribuição de Tráfego</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {Object.entries(result.summary.protocols).map(([p, count]: any) => (
                    <div key={p} className="badge badge-primary" style={{ padding: '4px 12px' }}>
                      {p}: {count}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div className="section-title">
                  <Cpu size={14} style={{ marginRight: '6px' }} />
                  Relatório de Inteligência
                </div>
                <div style={{ 
                  backgroundColor: 'var(--bg-surface-3)', 
                  padding: '1.5rem', 
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.88rem',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-medium)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-main)',
                  position: 'relative'
                }}>
                  <div style={{ position: 'sticky', top: 0, right: 0, float: 'right', display: 'flex', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                  </div>
                  {result.analysis}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Flows Dashboard */}
      {result && (
        <div className="card glass fade-in" style={{ marginTop: '2rem' }}>
          <div className="card-header" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Explorador de Fluxos (Top 20)</h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
              {result.summary.errors.length} anomalias detectadas
            </span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Endereço Origem {'>'} Destino</th>
                  <th>Protocolo</th>
                  <th>Carga (Pacotes)</th>
                  <th>Status de Rede</th>
                </tr>
              </thead>
              <tbody>
                {result.summary.topFlows.map(([key, data]: any) => {
                  const hasError = result.summary.errors.some((e: string) => e.includes(key));
                  return (
                    <tr key={key}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {key}
                      </td>
                      <td>
                        <span className={`badge ${data.proto === 'SIP' || data.proto === 'RTP' ? 'badge-primary' : ''}`}>
                          {data.proto}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'var(--bg-surface-3)', borderRadius: '2px', minWidth: '60px' }}>
                            <div style={{ 
                              height: '100%', 
                              background: 'var(--primary)', 
                              width: `${Math.min(100, (data.packets / 100) * 100)}%`,
                              borderRadius: '2px',
                              boxShadow: '0 0 8px var(--primary-glow)'
                            }}></div>
                          </div>
                          {data.packets}
                        </div>
                      </td>
                      <td>
                        {hasError ? (
                          <span className="badge badge-danger">Crítico / Anomalia</span>
                        ) : (
                          <span className="badge badge-success">Sincronizado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <style>{`
        .upload-zone:hover {
          border-color: var(--primary) !important;
          box-shadow: 0 0 15px var(--primary-glow);
        }
        .pulse {
          animation: glow-pulse 2s infinite;
        }
        @keyframes pulse-bar {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
