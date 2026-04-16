import { useState } from 'react';
import axios from 'axios';
import { Upload, FileSearch, Loader2, Network, ShieldAlert, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PcapAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('pcap', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/pcap/analyze', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao processar o arquivo. Verifique sua chave de IA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">
          <Network size={28} style={{ marginRight: '12px', color: 'var(--primary)' }} />
          Analisador de Tráfego AI (PCAP)
        </h1>
        <p className="page-subtitle">Diagnóstico inteligente de protocolos SIP, RTP e HTTP usando modelos generativos.</p>
      </header>

      <div className="grid" style={{ gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        
        {/* Upload Section */}
        <div className="card glass">
          <div className="card-header">
            <h3 className="card-title">Upload de Arquivo</h3>
          </div>
          <div className="card-body">
            <div 
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('pcap-upload')?.click()}
            >
              <Upload size={48} color="var(--primary)" style={{ opacity: 0.7, marginBottom: '1rem' }} />
              <input 
                id="pcap-upload" 
                type="file" 
                accept=".pcap,.pcapng" 
                hidden 
                onChange={handleFileChange} 
              />
              <p style={{ fontWeight: '500' }}>
                {file ? file.name : 'Arraste seu arquivo .pcap aqui'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Limite de 50MB por arquivo
              </p>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <FileSearch size={20} />}
              {loading ? 'Analisando com IA...' : 'Iniciar Análise Inteligente'}
            </button>

            {error && (
              <div style={{ marginTop: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results Sidebar / Summary */}
        {result && (
          <div className="card glass pulse-border">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="var(--success)" />
                Análise Concluída
              </h3>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Distribuição de Protocolos</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {Object.entries(result.summary.protocols).map(([p, count]: any) => (
                    <div key={p} className="badge" style={{ backgroundColor: 'rgba(2, 132, 199, 0.14)' }}>
                      {p}: {count}
                    </div>
                  ))}
                </div>
              </div>

              {/* SIP/HTTP Badges */}
              {(Object.keys(result.summary.sip).length > 0 || Object.keys(result.summary.http).length > 0) && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                  {Object.keys(result.summary.sip).length > 0 && (
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Métodos SIP</h4>
                      <div className="card" style={{ padding: '0.5rem', fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        {Object.entries(result.summary.sip).map(([m, c]: any) => (
                          <div key={m} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{m}</span><span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Analysis Text */}
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={16} />
                  Conclusões da IA
                </h4>
                <div className="ai-report" style={{ 
                  backgroundColor: 'rgba(0,0,0,0.3)', 
                  padding: '1.25rem', 
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  {result.analysis}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Flows List (Full Width Below) */}
      {result && (
        <div className="card glass" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h3 className="card-title">Top 20 Fluxos de Rede Detectados</h3>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fluxo (Origem {'>'} Destino)</th>
                  <th>Protocolo</th>
                  <th>Pacotes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.summary.topFlows.map(([key, data]: any) => (
                  <tr key={key}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{key}</td>
                    <td><span className="badge">{data.proto}</span></td>
                    <td>{data.packets}</td>
                    <td>
                      {result.summary.errors.some((e: string) => e.includes(key)) ? (
                        <span style={{ color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldAlert size={14} /> Anomalia
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>Saudável</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
