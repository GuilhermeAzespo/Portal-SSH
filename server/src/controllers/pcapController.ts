import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pcap from 'pcap-parser';
import { analyzeWithAI } from '../services/aiService';

// Configure multer for file uploads
const uploadFolder = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, `pcap-${Date.now()}-${file.originalname}`);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
}).single('pcap');

export const analyzePcap = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  console.log(`[PCAP CONTROLLER] Starting analysis of file: ${req.file.originalname} (${req.file.size} bytes)`);

  const filePath = req.file.path;
  const parser = pcap.parse(filePath);
  
  const summary: any = {
    fileName: req.file.originalname,
    totalPackets: 0,
    protocols: {},
    flows: {},
    sipMethods: {},
    httpMethods: {},
    errorsDetected: []
  };

  let linkLayerOffset = 14;

  parser.on('globalHeader', (header: any) => {
    // 1=Ethernet, 113=SLL, 12=Raw, 14=Raw IPv4
    if (header.network === 113) linkLayerOffset = 16;
    else if (header.network === 0) linkLayerOffset = 4;
    else if (header.network === 101 || header.network === 12 || header.network === 14) linkLayerOffset = 0;
  });

  parser.on('packet', (packet: any) => {
    summary.totalPackets++;
    const data = packet.data;
    if (data.length < linkLayerOffset + 20) return; 

    let ipOffset = linkLayerOffset;
    
    // Identificar offset do IPv4 com base no cabeçalho Link-Layer
    if (linkLayerOffset === 14) {
      let ethType = data.readUInt16BE(12);
      if (ethType === 0x8100) { // Tratamento para VLAN 802.1Q
        ethType = data.readUInt16BE(16);
        ipOffset = 18;
      }
      if (ethType !== 0x0800) return; 
    } else if (linkLayerOffset === 16) { // Linux SLL
      const ethType = data.readUInt16BE(14);
      if (ethType !== 0x0800) return;
    } else if (linkLayerOffset === 4) { // Loopback Null
      const family = data.readUInt32LE(0);
      if (family !== 2 && family !== 30) return;
    }

    // Validar se é realmente um pacote IPv4
    const ipVersion = data[ipOffset] >> 4;
    if (ipVersion !== 4) return;

    const ipProto = data[ipOffset + 9];
    const srcIp = `${data[ipOffset + 12]}.${data[ipOffset + 13]}.${data[ipOffset + 14]}.${data[ipOffset + 15]}`;
    const dstIp = `${data[ipOffset + 16]}.${data[ipOffset + 17]}.${data[ipOffset + 18]}.${data[ipOffset + 19]}`;
    
    const protoName = ipProto === 6 ? 'TCP' : ipProto === 17 ? 'UDP' : `Proto-${ipProto}`;
    summary.protocols[protoName] = (summary.protocols[protoName] || 0) + 1;

    if (ipProto === 6 || ipProto === 17) {
      const srcPort = data.readUInt16BE(ipOffset + (data[ipOffset] & 0x0f) * 4);
      const dstPort = data.readUInt16BE(ipOffset + (data[ipOffset] & 0x0f) * 4 + 2);
      const flowKey = `${srcIp}:${srcPort}->${dstIp}:${dstPort}`;
      
      if (!summary.flows[flowKey]) {
        summary.flows[flowKey] = { packets: 0, proto: protoName };
      }
      summary.flows[flowKey].packets++;

      // Payload scanning
      const headerLen = (data[ipOffset] & 0x0F) * 4;
      const transportOffset = ipOffset + headerLen;
      const appDataOffset = ipProto === 6 ? transportOffset + ((data[transportOffset + 12] >> 4) * 4) : transportOffset + 8;
      
      if (data.length > appDataOffset) {
        const payload = data.toString('utf8', appDataOffset).substring(0, 500);
        
        if (payload.includes('SIP/2.0')) {
          const methodMatch = payload.match(/^(INVITE|REGISTER|BYE|ACK|OPTIONS|CANCEL|SUBSCRIBE|NOTIFY|PUBLISH|INFO|REFER|MESSAGE|UPDATE|PRACK)/);
          if (methodMatch) {
            summary.sipMethods[methodMatch[1]] = (summary.sipMethods[methodMatch[1]] || 0) + 1;
          }
          if (payload.includes('SIP/2.0 4') || payload.includes('SIP/2.0 5')) {
            summary.errorsDetected.push(`Erro SIP detectado em ${flowKey}`);
          }
        }
        
        if (payload.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) /)) {
          const method = payload.split(' ')[0];
          summary.httpMethods[method] = (summary.httpMethods[method] || 0) + 1;
        }
      }
    }
  });

  parser.on('end', async () => {
    console.log(`[PCAP CONTROLLER] Parsing completed. Total packets: ${summary.totalPackets}`);
    try {
      const topFlows = Object.entries(summary.flows)
        .sort((a: any, b: any) => b[1].packets - a[1].packets)
        .slice(0, 20);
      
      const aiSummary = {
        meta: { fileName: summary.fileName, totalPackets: summary.totalPackets },
        protocols: summary.protocols,
        topFlows,
        sip: summary.sipMethods,
        http: summary.httpMethods,
        errors: summary.errorsDetected.slice(0, 10)
      };

      console.log(`[PCAP CONTROLLER] Sending summary to AI Service...`);
      const aiAnalysis = await analyzeWithAI(aiSummary);
      
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.json({
        summary: aiSummary,
        analysis: aiAnalysis
      });
    } catch (error: any) {
      console.error(`[PCAP CONTROLLER] AI Analysis failed:`, error.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(500).json({ error: error.message || 'Erro na análise de IA' });
    }
  });

  parser.on('error', (err: any) => {
    console.error(`[PCAP CONTROLLER] Parser error:`, err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Erro ao processar arquivo PCAP (possível arquivo corrompido ou formato inválido)' });
  });
};
