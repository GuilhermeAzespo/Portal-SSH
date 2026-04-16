import axios from 'axios';
import { db } from '../db/database';

export const analyzeWithAI = async (summary: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = 'openrouter_key'", (err, keyRow: any) => {
      if (err) return reject('Erro ao acessar banco de dados');
      
      db.get("SELECT value FROM settings WHERE key = 'ai_model'", async (err, modelRow: any) => {
        if (err) return reject('Erro ao acessar banco de dados');
        
        const apiKey = keyRow?.value;
        const model = modelRow?.value || 'google/gemini-2.0-flash-001';

        if (!apiKey) {
          return reject('OpenRouter API Key não configurada. Vá em Configurações de IA.');
        }

        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: model,
              messages: [
                {
                  role: 'system',
                  content: 'Você é um especialista altamente qualificado em Redes, Segurança Cibernética e Telecomunicações. Sua tarefa é analisar um resumo de tráfego de rede extraído de um arquivo PCAP. Procure especificamente por: \n1. Problemas em SIP (erros 4xx, 5xx, timeouts de INVITE).\n2. Estatísticas de RTP (fluxos interrompidos, jitter excessivo).\n3. Anomalias HTTP (erros de servidor, excesso de requisições).\n4. Possíveis varreduras de porta ou comportamentos suspeitos.\nRetorne uma análise técnica, direta e com recomendações de correção.'
                },
                {
                  role: 'user',
                  content: `Aqui está o resumo dos fluxos detectados no PCAP:\n\n${JSON.stringify(summary, null, 2)}`
                }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://github.com/GuilhermeAzespo/Portal-SSH',
                'X-Title': 'Portal SSH v3.0.0',
                'Content-Type': 'application/json'
              }
            }
          );

          resolve(response.data.choices[0].message.content);
        } catch (error: any) {
          console.error('AI Analysis Error:', error.response?.data || error.message);
          reject(error.response?.data?.error?.message || error.message || 'Erro desconhecido na API do OpenRouter');
        }
      });
    });
  });
};
