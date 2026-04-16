import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, BrainCircuit, ShieldCheck, Info } from 'lucide-react';

export default function AiSettings() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('google/gemini-2.0-flash-001');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/settings', {
        openrouter_key: apiKey,
        ai_model: model
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const models = [
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Recomendado)' },
    { id: 'x-ai/grok-2-1212', name: 'Grok 2.1' },
    { id: 'openai/chatgpt-4o-latest', name: 'GPT-4o' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat v3' }
  ];

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <header className="page-header">
        <h1 className="page-title">
          <BrainCircuit size={24} style={{ marginRight: '10px', color: 'var(--primary)' }} />
          Configurações de Inteligência Artificial
        </h1>
        <p className="page-subtitle">Configure o motor de análise para o Analisador PCAP via OpenRouter.</p>
      </header>

      <div className="card glass" style={{ marginTop: '2rem' }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              OpenRouter API Key
            </label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="v1.openrouter.ai..."
              style={{ fontFamily: 'monospace' }}
            />
            <small style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              Sua chave é armazenada de forma segura no banco de dados local.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Modelo de Linguagem (LLM)</label>
            <select
              className="form-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            backgroundColor: 'rgba(2, 132, 199, 0.1)', 
            border: '1px solid rgba(2, 132, 199, 0.2)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <Info size={18} color="var(--primary)" style={{ marginTop: '2px' }} />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>Por que OpenRouter?</strong><br />
              O OpenRouter permite alternar entre os melhores modelos do mundo (como Gemini, Grok e GPT-4) sem mudar uma linha de código. 
              Ao configurar sua chave, o Analisador PCAP usará a inteligência do modelo selecionado para diagnosticar sua rede.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleSave} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>

          {message && (
            <div style={{ 
              textAlign: 'center', 
              color: message.includes('Erro') ? 'var(--danger)' : 'var(--success)',
              fontWeight: '500'
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
