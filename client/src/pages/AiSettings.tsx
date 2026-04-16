import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, BrainCircuit, ShieldCheck, Info, Loader2 } from 'lucide-react';

export default function AiSettings() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('google/gemini-2.0-flash-001');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | '' }>({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.openrouter_key) setApiKey(res.data.openrouter_key);
      if (res.data.ai_model) setModel(res.data.ai_model);
    } catch (error) {
      console.error('Erro ao buscar configurações', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/settings', {
        openrouter_key: apiKey,
        ai_model: model
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Erro ao salvar configurações.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const models = [
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Recomendado)', provider: 'Google' },
    { id: 'x-ai/grok-2-1212', name: 'Grok 2.1', provider: 'xAI' },
    { id: 'openai/chatgpt-4o-latest', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat v3', provider: 'DeepSeek' }
  ];

  if (fetching) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="main-content fade-in" style={{ maxWidth: '800px' }}>
      <header className="page-header">
        <h1 className="page-title">
          <BrainCircuit size={28} />
          Inteligência Artificial 
          <span className="badge badge-primary" style={{ marginLeft: '12px' }}>v3.0</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configuração do motor de análise preditiva via OpenRouter.
        </p>
      </header>

      <div className="card glass" style={{ marginTop: '1.5rem', overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '2rem' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              Chave de API (OpenRouter)
            </label>
            <input
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="v1.openrouter.ai..."
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '6px', fontStyle: 'italic' }}>
              Padrão: v1.openrouter.ai... (Sua chave é salva apenas no seu banco de dados local).
            </p>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label" style={{ color: 'var(--text-main)' }}>Modelo de Diagnóstico (LLM)</label>
            <select
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ appearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, var(--primary) 50%), linear-gradient(135deg, var(--primary) 50%, transparent 50%)', backgroundPosition: 'calc(100% - 20px) calc(1em + 2px), calc(100% - 15px) calc(1em + 2px)', backgroundSize: '5px 5px, 5px 5px', backgroundRepeat: 'no-repeat' }}
            >
              {models.map(m => (
                <option key={m.id} value={m.id} style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                  {m.name} - {m.provider}
                </option>
              ))}
            </select>
          </div>

          <div style={{ 
            marginTop: '2rem',
            padding: '1.25rem', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(to bottom right, rgba(0, 212, 170, 0.05), rgba(124, 58, 237, 0.05))', 
            border: '1px solid rgba(0, 212, 170, 0.1)',
            display: 'flex',
            gap: '12px',
            boxShadow: 'inset 0 0 15px rgba(0, 212, 170, 0.02)'
          }}>
            <div style={{ background: 'var(--primary-glow)', padding: '8px', borderRadius: '8px', height: 'fit-content' }}>
              <Info size={18} color="var(--primary)" />
            </div>
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px', fontWeight: 600 }}>Arquitetura de Análise Unificada</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                O motor utiliza o <strong>OpenRouter</strong> para orquestrar entre os modelos de linguagem mais avançados. 
                Ao configurar sua chave, o sistema habilita o Analisador PCAP para diagnosticar protocolos de telecom (SIP, RTP) com precisão de nível humano.
              </p>
            </div>
          </div>

          {message.text && (
            <div className="fade-in" style={{ 
              marginTop: '1.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: message.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
              color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 500,
              border: `1px solid ${message.type === 'error' ? 'rgba(248,113,113,0.2)' : 'rgba(16,185,129,0.2)'}`
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button 
              className="button" 
              onClick={handleSave} 
              disabled={loading}
              style={{ minWidth: '180px' }}
            >
              {loading ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              {loading ? 'Sincronizando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
