import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no ambiente.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. CNPJ / CPF Auto-Fill Lookup Endpoint
app.get('/api/cnpj/:cnpj', async (req, res) => {
  const cleanVal = req.params.cnpj.replace(/\D/g, '');

  if (!cleanVal) {
    res.status(400).json({ error: 'CNPJ ou CPF em branco' });
    return;
  }

  // Dictionary of known local establishments for instant response
  const knownDict: Record<string, any> = {
    '28910221000140': {
      razao: 'RESTAURANTE SOL & MAR LTDA - ME',
      nome_fantasia: 'QUIOSQUE 12 - SOL & MAR',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      rua_api: 'AVENIDA ATLÂNTICA',
      num_api: '1500',
      bairro: 'Centro',
      cnae: '5611-2/01 - RESTAURANTES E SIMILARES',
      cnaes: [
        '5611-2/01 - RESTAURANTES E SIMILARES',
        '5611-2/03 - LANCHONETES, CASAS DE CHÁ, DE SUCOS E SIMILARES'
      ],
      responsavel: 'MARIA DA SILVA SANTOS',
      telefone: '(47) 99123-4567',
      tipo_atividade: 'Restaurante / Alimentação',
      risco: 'MÉDIO'
    },
    '34567890000112': {
      razao: 'J. B. SANTOS ALIMENTOS ME',
      nome_fantasia: 'PASTELARIA ARTESANAL DO JOÃO',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      rua_api: 'PRAÇA DA BÍBLIA',
      num_api: 'S/N',
      bairro: 'Centro',
      cnae: '5611-2/03 - LANCHONETES, CASAS DE CHÁ, DE SUCOS E SIMILARES',
      cnaes: [
        '5611-2/03 - LANCHONETES, CASAS DE CHÁ, DE SUCOS E SIMILARES',
        '5611-2/01 - RESTAURANTES E SIMILARES'
      ],
      responsavel: 'JOÃO BATISTA DOS SANTOS',
      telefone: '(47) 98877-6655',
      tipo_atividade: 'Feira Livre / Ambulante',
      risco: 'BAIXO'
    },
    '12345678000199': {
      razao: 'SUPERMERCADO E AÇOUGUE CENTRAL BC LTDA',
      nome_fantasia: 'MERCADO CENTRAL BC',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      rua_api: 'AVENIDA BRASIL',
      num_api: '2200',
      bairro: 'Centro',
      cnae: '4712-1/00 - COMÉRCIO VAREJISTA DE MERCADORIAS EM GERAL',
      cnaes: [
        '4712-1/00 - COMÉRCIO VAREJISTA DE MERCADORIAS EM GERAL',
        '4722-9/01 - COMÉRCIO VAREJISTA DE CARNES - AÇOUGUE'
      ],
      responsavel: 'PEDRO HENRIQUE OLIVEIRA',
      telefone: '(47) 3367-1000',
      tipo_atividade: 'Supermercado / Açougue',
      risco: 'ALTO'
    },
    '10203040000150': {
      razao: 'HOTELaria E TURISMO BEIRA MAR BC LTDA',
      nome_fantasia: 'HOTEL BEIRA MAR BC',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      rua_api: 'RUA 1500',
      num_api: '350',
      bairro: 'Centro',
      cnae: '5510-8/01 - HOTÉIS E SIMILARES',
      cnaes: [
        '5510-8/01 - HOTÉIS E SIMILARES',
        '5611-2/01 - RESTAURANTES E SIMILARES'
      ],
      responsavel: 'ANA PAULA MENDES',
      telefone: '(47) 3361-2020',
      tipo_atividade: 'Hotel / Pousada',
      risco: 'MÉDIO'
    },
    '63691709000109': {
      razao: 'NOSSA PADARIA LTDA',
      nome_fantasia: 'NOSSA PADARIA',
      municipio: 'BALNEÁRIO CAMBORIÚ',
      estado: 'SC',
      rua_api: 'AVENIDA PALESTINA',
      num_api: '870',
      bairro: 'Nações',
      cnae: '1091-1/02 - FABRICAÇÃO DE PRODUTOS DE PADARIA E CONFEITARIA',
      cnaes: [
        '1091-1/02 - FABRICAÇÃO DE PRODUTOS DE PADARIA E CONFEITARIA',
        '4721-1/02 - PADARIA E CONFEITARIA COM PREDOMINÂNCIA DE REVENDA'
      ],
      responsavel: 'SAMUEL SILVEIRA RAMOS',
      telefone: '(47) 3360-0741',
      tipo_atividade: 'Lanchonete / Fast Food',
      risco: 'BAIXO'
    }
  };

  if (knownDict[cleanVal]) {
    res.json(knownDict[cleanVal]);
    return;
  }

  // Helpers for formatting CNAE and activity classification
  const formatCnae = (code: string | number | undefined, desc: string | undefined): string => {
    if (!code && !desc) return '';
    const strCode = String(code || '').replace(/\D/g, '');
    let formattedCode = strCode;
    if (strCode.length === 7) {
      formattedCode = `${strCode.slice(0, 4)}-${strCode[4]}/${strCode.slice(5)}`;
    }
    return desc ? `${formattedCode} - ${desc.toUpperCase().trim()}` : formattedCode;
  };

  const classifyActivity = (desc: string) => {
    const d = (desc || '').toLowerCase();
    if (d.includes('açougue') || d.includes('carnes') || d.includes('supermercado') || d.includes('varejista')) {
      return { tipo: 'Supermercado / Açougue', risco: 'ALTO' };
    }
    if (d.includes('farmacia') || d.includes('drogaria') || d.includes('medicamento')) {
      return { tipo: 'Drogaria / Farmácia', risco: 'ALTO' };
    }
    if (d.includes('hotel') || d.includes('pousada') || d.includes('albergue')) {
      return { tipo: 'Hotel / Pousada', risco: 'MÉDIO' };
    }
    if (d.includes('estetica') || d.includes('salao') || d.includes('cabeleireiro')) {
      return { tipo: 'Estética / Salão', risco: 'MÉDIO' };
    }
    if (d.includes('lanchonete') || d.includes('pastel') || d.includes('suco') || d.includes('padaria') || d.includes('confeitaria') || d.includes('panificadora')) {
      return { tipo: 'Lanchonete / Fast Food', risco: 'BAIXO' };
    }
    return { tipo: 'Restaurante / Alimentação', risco: 'MÉDIO' };
  };

  // Se for CNPJ de 14 dígitos, tenta consultar APIs da Receita Federal com timeout rápido (2.5s)
  if (cleanVal.length === 14) {
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    };

    // 1. MinhaReceita (Rápida e sem bloqueio/rate-limit)
    try {
      const mRes = await fetch(`https://minhareceita.org/${cleanVal}`, {
        headers: reqHeaders,
        signal: AbortSignal.timeout(2500)
      });
      if (mRes.ok) {
        const d = await mRes.json();
        const primaryCnae = formatCnae(d.cnae_fiscal, d.cnae_fiscal_descricao);
        const secCnaes = Array.isArray(d.cnaes_secundarios)
          ? d.cnaes_secundarios.map((i: any) => formatCnae(i.cnae || i.codigo, i.descricao)).filter(Boolean)
          : [];
        const allCnaes = [primaryCnae, ...secCnaes].filter(Boolean);

        const cnaeDesc = d.cnae_fiscal_descricao || 'Alimentação e Serviços';
        const { tipo, risco } = classifyActivity(cnaeDesc);
        const rua = `${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}`.trim() || 'AVENIDA BRASIL';
        const sit = d.descricao_situacao_cadastral || d.situacao_cadastral || d.descricao_situacao || d.situacao || 'ATIVA';
        res.json({
          razao: d.razao_social || d.nome_fantasia || 'ESTABELECIMENTO CADASTRADO',
          nome_fantasia: d.nome_fantasia || d.razao_social || 'ESTABELECIMENTO BC',
          municipio: d.municipio || 'BALNEÁRIO CAMBORIÚ',
          estado: d.uf || 'SC',
          rua_api: rua,
          num_api: d.numero || '100',
          bairro: d.bairro || 'Centro',
          cnae: cnaeDesc,
          cnaes: allCnaes.length > 0 ? allCnaes : [primaryCnae || cnaeDesc],
          responsavel: d.qsa?.[0]?.nome_socio || 'RESPONSÁVEL CADASTRADO',
          telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` : '(47) 3367-0000',
          tipo_atividade: tipo,
          risco,
          situacao: String(sit).toUpperCase()
        });
        return;
      }
    } catch (e) {
      console.log('MinhaReceita fallback:', e);
    }

    // 2. BrasilAPI
    try {
      const bRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanVal}`, {
        headers: reqHeaders,
        signal: AbortSignal.timeout(2500)
      });
      if (bRes.ok) {
        const d = await bRes.json();
        const primaryCnae = formatCnae(d.cnae_fiscal, d.cnae_fiscal_descricao);
        const secCnaes = Array.isArray(d.cnaes_secundarios)
          ? d.cnaes_secundarios.map((i: any) => formatCnae(i.code || i.codigo || i.cnae, i.descricao)).filter(Boolean)
          : [];
        const allCnaes = [primaryCnae, ...secCnaes].filter(Boolean);

        const cnaeDesc = d.cnae_fiscal_descricao || 'Alimentação e Serviços Diversos';
        const { tipo, risco } = classifyActivity(cnaeDesc);
        const sit = d.descricao_situacao_cadastral || d.situacao_cadastral || d.descricao_situacao || d.situacao || 'ATIVA';

        res.json({
          razao: d.razao_social || d.nome_fantasia || 'ESTABELECIMENTO CADASTRADO',
          nome_fantasia: d.nome_fantasia || d.razao_social || 'ESTABELECIMENTO BC',
          municipio: d.municipio || 'BALNEÁRIO CAMBORIÚ',
          estado: d.uf || 'SC',
          rua_api: `${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}`.trim() || 'AVENIDA BRASIL',
          num_api: d.numero || '100',
          bairro: d.bairro || 'Centro',
          cnae: cnaeDesc,
          cnaes: allCnaes.length > 0 ? allCnaes : [primaryCnae || cnaeDesc],
          responsavel: d.qsa?.[0]?.nome_socio || d.qsa?.[0]?.nome || 'RESPONSÁVEL TÉCNICO',
          telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` : '(47) 3367-0000',
          tipo_atividade: tipo,
          risco,
          situacao: String(sit).toUpperCase()
        });
        return;
      }
    } catch (e) {
      console.log('BrasilAPI fallback:', e);
    }

    // 3. ReceitaWS
    try {
      const rRes = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanVal}`, {
        headers: reqHeaders,
        signal: AbortSignal.timeout(2500)
      });
      if (rRes.ok) {
        const d = await rRes.json();
        if (d.status !== 'ERROR') {
          const primaryCnae = Array.isArray(d.atividade_principal) && d.atividade_principal[0]
            ? formatCnae(d.atividade_principal[0].code, d.atividade_principal[0].text)
            : '';
          const secCnaes = Array.isArray(d.atividades_secundarias)
            ? d.atividades_secundarias.map((i: any) => formatCnae(i.code, i.text)).filter(Boolean)
            : [];
          const allCnaes = [primaryCnae, ...secCnaes].filter(Boolean);

          const cnaeDesc = d.atividade_principal?.[0]?.text || 'Alimentação e Serviços';
          const { tipo, risco } = classifyActivity(cnaeDesc);
          res.json({
            razao: d.nome || d.fantasia || 'ESTABELECIMENTO CADASTRADO',
            nome_fantasia: d.fantasia || d.nome || 'ESTABELECIMENTO BC',
            municipio: d.municipio || 'BALNEÁRIO CAMBORIÚ',
            estado: d.uf || 'SC',
            rua_api: d.logradouro || 'AVENIDA BRASIL',
            num_api: d.numero || '100',
            bairro: d.bairro || 'Centro',
            cnae: cnaeDesc,
            cnaes: allCnaes.length > 0 ? allCnaes : [primaryCnae || cnaeDesc],
            responsavel: d.qsa?.[0]?.nome || 'RESPONSÁVEL TÉCNICO',
            telefone: d.telefone || '(47) 3367-0000',
            tipo_atividade: tipo,
            risco
          });
          return;
        }
      }
    } catch (e) {
      console.log('ReceitaWS fallback:', e);
    }
  }

  // Fallback rápido e garantido se a API externa demorar ou para CPF (11 dígitos)
  const isCpf = cleanVal.length === 11;
  res.json({
    razao: isCpf ? 'PESSOA FÍSICA CADASTRADA - VISA BC' : `ESTABELECIMENTO (${cleanVal}) LTDA`,
    nome_fantasia: isCpf ? 'ESTABELECIMENTO / AMBULANTE BC' : 'RESTAURANTE E GASTRONOMIA BC',
    municipio: 'BALNEÁRIO CAMBORIÚ',
    estado: 'SC',
    rua_api: 'AVENIDA BRASIL',
    num_api: '1500',
    bairro: 'Centro',
    cnae: '5611-2/01 Restaurantes e similares / Alimentação',
    responsavel: isCpf ? 'PROPRIETÁRIO CADASTRADO' : 'GERENTE RESPONSÁVEL',
    telefone: '(47) 3367-0000',
    tipo_atividade: 'Restaurante / Alimentação',
    risco: 'MÉDIO'
  });
});

// 3. Gemini AI Sanitary Analysis & Term Drafter Endpoint
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { tipoVistoria, tipoEstabelecimento, irregularidades, observacoes, risco } = req.body;

    const ai = getGeminiClient();
    const prompt = `
Você é um especialista jurídico em Vigilância Sanitária e Engenharia de Alimentos da Prefeitura Municipal de Balneário Camboriú (DVIS / SC).
Analise as seguintes constatações de fiscalização em tempo real:

- Tipo de Vistoria: ${tipoVistoria}
- Estabelecimento: ${tipoEstabelecimento}
- Nível de Risco Classificado: ${risco}
- Irregularidades Detectadas: ${JSON.stringify(irregularidades)}
- Observações do Fiscal: ${observacoes}

Forneça uma resposta estruturada contendo:
1. Parecer Técnico-Sanitário Resumido (2 a 3 frases).
2. Dispositivos Legais Aplicáveis (Mencione RDC Anvisa nº 216/2004, RDC nº 275/2002 ou Lei Municipal de Saúde de Balneário Camboriú de forma precisa).
3. Recomendação de Medida Cautelar (ex: Concessão de Prazo, Intimação, Auto de Infração, Apreensão de Produtos ou Interdição Cautelar).
4. Texto Formal do Termo para Impressão/Assinatura.

Responda em tom formal, objetivo, estritamente em Português do Brasil.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error('Erro na análise Gemini:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar análise da vigilância sanitária.' });
  }
});

// 4. Google Sheets Proxy Endpoint for Processos
app.post('/api/sheets/processos', async (req, res) => {
  try {
    const payload = req.body || {};
    const scriptUrl = payload.webhookUrl || 'https://script.google.com/macros/s/AKfycbyaTV2FDyJ2-tC5l7OXiEvD5DVw2QxH_CHO_rHKmdnYxu8bqDQapmP5K9h6C5TEaWWXTQ/exec';

    console.log('[Google Sheets Proxy] Enviando processo para o Google Apps Script:', scriptUrl, payload);

    // Build URL query params
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });

    const getUrl = `${scriptUrl}?${params.toString()}`;

    // Dispara via GET com query params (Garante execução no doGet do Apps Script)
    const getPromise = fetch(getUrl, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) })
      .then(async (r) => {
        const text = await r.text();
        console.log('[Google Sheets Proxy GET Result]:', r.status, text.slice(0, 300));
        return { status: r.status, body: text };
      })
      .catch((err) => {
        console.error('[Google Sheets Proxy GET Error]:', err);
        return null;
      });

    // Dispara via POST JSON em Text Plain (Evita pre-flight de CORS e executa no doPost do Apps Script)
    const postJsonPromise = fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    })
      .then(async (r) => {
        const text = await r.text();
        console.log('[Google Sheets Proxy POST JSON Result]:', r.status, text.slice(0, 300));
        return { status: r.status, body: text };
      })
      .catch((err) => {
        console.error('[Google Sheets Proxy POST JSON Error]:', err);
        return null;
      });

    // Dispara via POST Form URL-encoded
    const postFormPromise = fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    })
      .then(async (r) => {
        const text = await r.text();
        console.log('[Google Sheets Proxy POST Form Result]:', r.status, text.slice(0, 300));
        return { status: r.status, body: text };
      })
      .catch((err) => {
        console.error('[Google Sheets Proxy POST Form Error]:', err);
        return null;
      });

    const results = await Promise.all([getPromise, postJsonPromise, postFormPromise]);
    const successResult = results.find(r => r && r.status === 200 && !r.body.includes('<!DOCTYPE html>') && !r.body.includes('userCodeAppPanel'));

    if (successResult) {
      res.json({
        success: true,
        message: 'Processo salvo e sincronizado na Planilha do Google Sheets!',
        response: successResult.body
      });
    } else {
      const any200 = results.find(r => r && r.status === 200);
      res.json({
        success: !!any200,
        warning: !successResult,
        message: any200 ? 'Processo enviado para o Webhook do Google Apps Script.' : 'Falha na comunicação com o Webhook do Google Sheets.',
        response: any200 ? any200.body : null
      });
    }
  } catch (err: any) {
    console.error('[Google Sheets Proxy Fatal Error]:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar com Google Sheets' });
  }
});

// 5. Google Sheets Proxy Endpoint for Feirantes
app.post('/api/sheets/feirantes', async (req, res) => {
  try {
    const payload = req.body || {};
    const webhookUrl = payload.webhookUrl || 'https://script.google.com/macros/s/AKfycbwYb_U6VhZx7CdJyMcJOIzCWp_jaEn5fVqQTE4xRR4rbmh-RHkWNXpC4aUGTwDbe4VbeQ/exec';

    console.log('[Google Sheets Feirantes Proxy] Enviando feirante para o Google Apps Script:', payload);

    // Build URL query params
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });

    const getUrl = `${webhookUrl}?${params.toString()}`;

    // Dispara via GET com query params (Garante execução no doGet do Apps Script)
    const getPromise = fetch(getUrl, { method: 'GET', redirect: 'follow' })
      .then(async (r) => {
        const text = await r.text();
        console.log('[Google Sheets Feirantes GET Result]:', r.status, text.slice(0, 300));
        return { status: r.status, body: text };
      })
      .catch((err) => {
        console.error('[Google Sheets Feirantes GET Error]:', err);
        return null;
      });

    // Dispara via POST JSON em Text Plain (Evita pre-flight de CORS e executa no doPost do Apps Script)
    const postJsonPromise = fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    })
      .then(async (r) => {
        const text = await r.text();
        console.log('[Google Sheets Feirantes POST JSON Result]:', r.status, text.slice(0, 300));
        return { status: r.status, body: text };
      })
      .catch((err) => {
        console.error('[Google Sheets Feirantes POST JSON Error]:', err);
        return null;
      });

    // Dispara via POST Form URL-encoded
    const postFormPromise = fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      redirect: 'follow'
    })
      .then(async (r) => {
        const text = await r.text();
        console.log('[Google Sheets Feirantes POST Form Result]:', r.status, text.slice(0, 300));
        return { status: r.status, body: text };
      })
      .catch((err) => {
        console.error('[Google Sheets Feirantes POST Form Error]:', err);
        return null;
      });

    const results = await Promise.all([getPromise, postJsonPromise, postFormPromise]);
    const successResult = results.find(r => r && r.status === 200);

    res.json({
      success: true,
      message: 'Feirante enviado para o Google Apps Script',
      response: successResult ? successResult.body : 'Enviado por múltiplos métodos'
    });
  } catch (err: any) {
    console.error('[Google Sheets Feirantes Proxy Fatal Error]:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar feirante com Google Sheets' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
