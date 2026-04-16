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

  parser.on('packet', (packet: any) => {
    summary.totalPackets++;
    
    // Minimal parsing of the packet data buffer
    // pcap-parser gives raw buffers. We need to look at ethernet/IP headers.
    // Ethernet (14 bytes) -> IP (20 bytes) -> TCP/UDP
    const data = packet.data;
    if (data.length < 34) return; // Not enough data for IP header

    // Check if it's IPv4 (Ethernet type 0x0800 at byte 12-13)
    const ethType = data.readUInt16BE(12);
    if (ethType !== 0x0800) return;

    const ipProto = data[23];
    const srcIp = `${data[26]}.${data[27]}.${data[28]}.${data[29]}`;
    const dstIp = `${data[30]}.${data[31]}.${data[32]}.${data[33]}`;
    
    const protoName = ipProto === 6 ? 'TCP' : ipProto === 17 ? 'UDP' : `Proto-${ipProto}`;
    summary.protocols[protoName] = (summary.protocols[protoName] || 0) + 1;

    // Extract ports if TCP/UDP
    if (ipProto === 6 || ipProto === 17) {
      const srcPort = data.readUInt16BE(34);
      const dstPort = data.readUInt16BE(36);
      const flowKey = `${srcIp}:${srcPort}->${dstIp}:${dstPort}`;
      
      if (!summary.flows[flowKey]) {
        summary.flows[flowKey] = { packets: 0, proto: protoName };
      }
      summary.flows[flowKey].packets++;

      // Deep inspection for SIP/HTTP (very basic string matching for demo/speed)
      // Application data starts after IP header (usually byte 34 for TCP/UDP header start)
      // + TCP (at least 20 bytes) or UDP (8 bytes)
      const appDataOffset = ipProto === 6 ? 34 + (data[46] >> 4) * 4 : 34 + 8;
      if (data.length > appDataOffset) {
        const payload = data.toString('utf8', appDataOffset).substring(0, 500);
        
        // SIP Detection
        if (payload.includes('SIP/2.0')) {
          const methodMatch = payload.match(/^(INVITE|REGISTER|BYE|ACK|OPTIONS|CANCEL|SUBSCRIBE|NOTIFY|PUBLISH|INFO|REFER|MESSAGE|UPDATE|PRACK)/);
          if (methodMatch) {
            summary.sipMethods[methodMatch[1]] = (summary.sipMethods[methodMatch[1]] || 0) + 1;
          }
          if (payload.includes('SIP/2.0 4') || payload.includes('SIP/2.0 5')) {
            summary.errorsDetected.push(`Erro SIP detectado em ${flowKey}`);
          }
        }
        
        // HTTP Detection
        if (payload.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) /)) {
          const method = payload.split(' ')[0];
          summary.httpMethods[method] = (summary.httpMethods[method] || 0) + 1;
        }
      }
    }
  });

  parser.on('end', async () => {
    try {
      // Clean up flow data to avoid huge payloads to AI
      const topFlows = Object.entries(summary.flows)
        .sort((a: any, b: any) => b[1].packets - a[1].packets)
        .slice(0, 20); // Top 20 flows only
      
      const aiSummary = {
        meta: { fileName: summary.fileName, totalPackets: summary.totalPackets },
        protocols: summary.protocols,
        topFlows,
        sip: summary.sipMethods,
        http: summary.httpMethods,
        errors: summary.errorsDetected.slice(0, 10)
      };

      const aiAnalysis = await analyzeWithAI(aiSummary);
      
      // Cleanup file after analysis
      fs.unlinkSync(filePath);

      res.json({
        summary: aiSummary,
        analysis: aiAnalysis
      });
    } catch (error: any) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(500).json({ error: error.message || 'Erro na análise de IA' });
    }
  });

  parser.on('error', (err: any) => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Erro ao processar arquivo PCAP' });
  });
};
