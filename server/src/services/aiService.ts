import axios from 'axios';
import { db } from '../db/database';

export const analyzeWithAI = async (summary: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Buscar configurações de forma sequencial para maior clareza
    db.get("SELECT value FROM settings WHERE key = 'openrouter_key'", (err, keyRow: any) => {
      if (err) return reject('Erro ao acessar banco de dados (chave)');
      
      db.get("SELECT value FROM settings WHERE key = 'ai_model'", async (err, modelRow: any) => {
        if (err) return reject('Erro ao acessar banco de dados (modelo)');
        
        const apiKey = keyRow?.value;
        const model = modelRow?.value || 'google/gemini-2.0-flash-001';

        if (!apiKey || apiKey.trim() === '') {
          return reject('OpenRouter API Key não configurada. Por favor, vá em Configurações de IA e salve sua chave.');
        }

        console.log(`[AI SERVICE] Iniciando análise com modelo: ${model}`);

        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: model,
              messages: [
                {
                  role: 'system',
                  content: 'Você é um especialista em Redes e Telecomunicações. Analise o resumo do PCAP e retorne um diagnóstico técnico claro sobre a saúde da rede, focando em erros de protocolo (SIP/HTTP) e qualidade de tráfego (RTP/UDP).'
                },
                {
                  role: 'user',
                  content: `Resumo do tráfego PCAP:\n${JSON.stringify(summary, null, 2)}`
                }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'HTTP-Referer': 'https://github.com/GuilhermeAzespo/Portal-SSH',
                'X-Title': 'Portal SSH v3.0.x',
                'Content-Type': 'application/json'
              },
              timeout: 30000 // 30 segundos de timeout
            }
          );

          if (response.data && response.data.choices && response.data.choices[0]) {
            resolve(response.data.choices[0].message.content);
          } else {
            console.error('[AI SERVICE] Resposta inesperada do OpenRouter:', response.data);
            reject('Resposta inválida do OpenRouter. Verifique se o modelo está disponível.');
          }
        } catch (error: any) {
          const errorDetail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
          console.error('[AI SERVICE] Erro na API do OpenRouter:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          
          let userMessage = 'Erro na análise de IA: ';
          if (error.response?.status === 401) userMessage += 'Chave de API inválida ou expirada.';
          else if (error.response?.status === 402) userMessage += 'Créditos insuficientes no OpenRouter.';
          else if (error.response?.status === 429) userMessage += 'Limite de requisições atingido (Rate Limit).';
          else userMessage += errorDetail;

          reject(userMessage);
        }
      });
    });
  });
};
