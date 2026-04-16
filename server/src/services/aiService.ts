import axios from 'axios';
import { db } from '../db/database';

/**
 * Helper to retrieve a setting from the database using Promises
 */
const getSetting = (key: string): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row: any) => {
      if (err) {
        console.error(`[AI SERVICE] Database error fetching ${key}:`, err);
        return reject(new Error(`Erro ao acessar banco de dados (${key})`));
      }
      resolve(row?.value);
    });
  });
};

export const analyzeWithAI = async (summary: any): Promise<string> => {
  try {
    // 1. Fetch configurations in parallel
    const [apiKey, model] = await Promise.all([
      getSetting('openrouter_key'),
      getSetting('ai_model')
    ]);

    const targetModel = model || 'google/gemini-2.0-flash-001';

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenRouter API Key não configurada. Por favor, vá em Configurações de IA e salve sua chave.');
    }

    console.log(`[AI SERVICE] Starting analysis...`);
    console.log(`[AI SERVICE] Model: ${targetModel}`);
    console.log(`[AI SERVICE] Payload Size: ${JSON.stringify(summary).length} bytes`);

    // 2. Request to OpenRouter
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: targetModel,
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
          'X-Title': 'Portal SSH v3.x',
          'Content-Type': 'application/json'
        },
        timeout: 45000 // Increased timeout to 45s for larger analyses
      }
    );

    // 3. Handle Response
    if (response.data && response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      console.log(`[AI SERVICE] Analysis completed successfully. Response length: ${content.length}`);
      return content;
    } else {
      console.error('[AI SERVICE] Unexpected OpenRouter response structure:', response.data);
      throw new Error('Resposta inválida do OpenRouter. O serviço pode estar instável.');
    }
  } catch (error: any) {
    // Enhanced Error Propagation
    let errorMessage = 'Falha na análise de IA: ';
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as any;
      const apiDetail = data?.error?.message || data?.message || error.message;

      console.error('[AI SERVICE] OpenRouter API Error:', {
        status,
        data,
        message: error.message
      });

      if (status === 401) errorMessage += 'Chave de API inválida ou expirada.';
      else if (status === 402) errorMessage += 'Saldo insuficiente no OpenRouter.';
      else if (status === 429) errorMessage += 'Limite de requisições atingido (Rate Limit).';
      else if (status === 503) errorMessage += 'O modelo está temporariamente indisponível.';
      else if (error.code === 'ECONNABORTED') errorMessage += 'Tempo limite esgotado (Timeout).';
      else errorMessage += apiDetail;
    } else {
      console.error('[AI SERVICE] Internal Error:', error);
      errorMessage += error.message;
    }

    throw new Error(errorMessage);
  }
};

