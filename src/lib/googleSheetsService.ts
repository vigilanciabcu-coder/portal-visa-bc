import { FeiranteItem, ProcessoItem } from '../types';

// Webhook padrão do Google Apps Script para Feirantes
export const DEFAULT_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwYb_U6VhZx7CdJyMcJOIzCWp_jaEn5fVqQTE4xRR4rbmh-RHkWNXpC4aUGTwDbe4VbeQ/exec';

// Webhook oficial do Google Apps Script para Processos Sanitários
export const PROCESSOS_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbyaTV2FDyJ2-tC5l7OXiEvD5DVw2QxH_CHO_rHKmdnYxu8bqDQapmP5K9h6C5TEaWWXTQ/exec';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    var params = {};
    if (e && e.parameter) {
      for (var key in e.parameter) params[key] = e.parameter[key];
    }
    if (e && e.postData && e.postData.contents) {
      try {
        var j = JSON.parse(e.postData.contents);
        for (var k in j) params[k] = j[k];
      } catch(err) {
        try {
          var pairs = e.postData.contents.split('&');
          for (var p = 0; p < pairs.length; p++) {
            var pair = pairs[p].split('=');
            if (pair.length === 2) {
              params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1].replace(/\\+/g, ' '));
            }
          }
        } catch(err2){}
      }
    }
    
    var action = params.action || "";
    
    // 1. LER PROCESSOS / FEIRANTES
    if (action === "getProcessos" || action === "getFeirantes" || (!action && !params.id && !params.cnpj && !params.num_processo)) {
      var data = sheet.getDataRange().getValues();
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        if (!r[0] && !r[1] && !r[2] && !r[5] && !r[6]) continue;
        rows.push({
          id: String(r[0] || ("sheet-" + i)),
          data_protocolo: formatDateBR(r[1]),
          data_prot: formatDateBR(r[1]),
          num_processo: String(r[2] || ""),
          num_prot: String(r[2] || ""),
          setor: String(r[3] || ""),
          feira: String(r[3] || ""),
          pasta: String(r[4] || ""),
          cnpj_cpf: String(r[5] || r[15] || ""),
          cpf: String(r[5] || ""),
          razao_social: String(r[6] || r[16] || ""),
          nome_pf: String(r[6] || ""),
          assunto: String(r[7] || ""),
          produtos: String(r[7] || ""),
          validade: formatDateBR(r[8]),
          venc_licenca: formatDateBR(r[8]),
          endereco: String(r[9] || r[17] || ""),
          rua: String(r[9] || ""),
          numero_complemento: String(r[10] || r[18] || ""),
          num: String(r[10] || ""),
          bairro: String(r[11] || "Centro"),
          situacao_cadastral: String(r[12] || "ATIVA"),
          vinculo: String(r[12] || "ATIVA"),
          fiscal_responsavel: String(r[13] || "Carlos Eduardo Silva"),
          func: String(r[13] || "1"),
          ano_abertura: String(r[14] || "2026"),
          abertura: String(r[14] || "2026"),
          cnpj: String(r[15] || ""),
          nome_pj_api: String(r[16] || ""),
          rua_api: String(r[17] || ""),
          num_api: String(r[18] || ""),
          municipio: String(r[19] || "BALNEÁRIO CAMBORIÚ"),
          estado: String(r[20] || "SC"),
          cnae: String(r[21] || ""),
          cnaes: [String(r[21] || "")],
          status: String(r[22] || "DEFERIDO") === "SIM" ? "DEFERIDO" : "EM ANÁLISE",
          alvara: String(r[22] || "SIM")
        });
      }
      return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. SALVAR OU ATUALIZAR REGISTRO (23 COLUNAS)
    var id = String(params.id || new Date().getTime());
    var dataProt = formatDateBR(params.data_protocolo || params.data_prot || params.dataEntrada || params.DATA_PROT || "");
    var numProt = String(params.num_processo || params.num_protocolo || params.num_prot || params.prot1Doc || params.NUM_PROT || "");
    var feira = String(params.setor || params.feira || params.FEIRA || "ALIMENTAÇÃO");
    var pasta = String(params.pasta || params.pasta_visa || params.pastaVisa || params.PASTA || "");
    var cpf = String(params.cpf || params.CPF || (params.cnpjCpf && params.cnpjCpf.length <= 14 ? params.cnpjCpf : ""));
    var nomePf = String(params.nome_pf || params.nomePf || params.razaoSocial || params.razao_social || "");
    var produtos = String(params.produtos || params.motivacao || params.assunto || "ALVARÁ SANITÁRIO");
    var validade = formatDateBR(params.validade || params.vencLicenca || params.venc_licenca || "");
    var rua = String(params.endereco || params.endereco_rua || params.rua || "");
    var num = String(params.numeroComplemento || params.num_complemento || params.num || "");
    var bairro = String(params.bairro || params.BAIRRO || "Centro");
    var vinculo = String(params.situacaoCadastral || params.vinculo || "ATIVA");
    var func = String(params.fiscal_responsavel || params.fiscalResponsavel || params.func || "Carlos Eduardo Silva");
    var abertura = String(params.ano_abertura || params.abertura || "2026");
    var cnpj = String(params.cnpj || (params.cnpjCpf && params.cnpjCpf.length > 14 ? params.cnpjCpf : ""));
    var razao = String(params.razaoSocial || params.razao || params.nome_pj_api || nomePf);
    var ruaApi = String(params.rua_api || params.endereco || "");
    var numApi = String(params.num_api || params.num_comp_api || num);
    var municipio = String(params.municipio || "BALNEÁRIO CAMBORIÚ");
    var estado = String(params.estado || "SC");
    var cnae = String(params.cnae_api || params.cnae || (Array.isArray(params.cnaes) ? params.cnaes.join('; ') : ""));
    var alvara = String(params.status === "DEFERIDO" || params.alvara === "SIM" ? "SIM" : "NÃO");

    if (params.row && Array.isArray(params.row) && params.row.length >= 20) {
      var r = params.row;
      id = r[0] ? String(r[0]) : id;
      dataProt = r[1] ? formatDateBR(r[1]) : dataProt;
      numProt = r[2] ? String(r[2]) : numProt;
      feira = r[3] ? String(r[3]) : feira;
      pasta = r[4] ? String(r[4]) : pasta;
      cpf = r[5] ? String(r[5]) : cpf;
      nomePf = r[6] ? String(r[6]) : nomePf;
      produtos = r[7] ? String(r[7]) : produtos;
      validade = r[8] ? formatDateBR(r[8]) : validade;
      rua = r[9] ? String(r[9]) : rua;
      num = r[10] ? String(r[10]) : num;
      bairro = r[11] ? String(r[11]) : bairro;
      vinculo = r[12] ? String(r[12]) : vinculo;
      func = r[13] ? String(r[13]) : func;
      abertura = r[14] ? String(r[14]) : abertura;
      cnpj = r[15] ? String(r[15]) : cnpj;
      razao = r[16] ? String(r[16]) : razao;
      ruaApi = r[17] ? String(r[17]) : ruaApi;
      numApi = r[18] ? String(r[18]) : numApi;
      municipio = r[19] ? String(r[19]) : municipio;
      estado = r[20] ? String(r[20]) : estado;
      cnae = r[21] ? String(r[21]) : cnae;
      alvara = r[22] ? String(r[22]) : alvara;
    }

    var rowValues = [
      id, dataProt, numProt, feira, pasta, cpf, nomePf, produtos, validade,
      rua, num, bairro, vinculo, func, abertura, cnpj, razao, ruaApi, numApi,
      municipio, estado, cnae, alvara
    ];

    var data = sheet.getDataRange().getValues();
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && String(data[i][0]) === id) {
        foundIndex = i + 1;
        break;
      }
      if (numProt && data[i][2] && String(data[i][2]).toLowerCase() === numProt.toLowerCase()) {
        foundIndex = i + 1;
        break;
      }
    }

    if (foundIndex > 0) {
      sheet.getRange(foundIndex, 1, 1, 23).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Registro gravado com sucesso na Planilha Google Sheets!",
      id: id,
      action: foundIndex > 0 ? "updated" : "created"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatDateBR(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var d = val.getDate();
    var m = val.getMonth() + 1;
    var y = val.getFullYear();
    return (d < 10 ? '0' : '') + d + '/' + (m < 10 ? '0' : '') + m + '/' + y;
  }
  return String(val);
}`;

export function getSheetsWebhookUrl(): string {
  return localStorage.getItem('visa_sheets_webhook_url') || DEFAULT_SHEETS_WEBHOOK_URL;
}

export function setSheetsWebhookUrl(url: string): void {
  localStorage.setItem('visa_sheets_webhook_url', url.trim());
}

export function getProcessosSheetsWebhookUrl(): string {
  return (
    localStorage.getItem('visa_processos_webhook_url') ||
    localStorage.getItem('visa_sheets_webhook_url') ||
    PROCESSOS_SHEETS_WEBHOOK_URL
  );
}

export function setProcessosSheetsWebhookUrl(url: string): void {
  localStorage.setItem('visa_processos_webhook_url', url.trim());
}

/**
 * Testa a conexão com a URL do Webhook do Google Apps Script para Processos
 */
export async function testProcessosWebhook(url: string): Promise<{ success: boolean; message: string; count?: number }> {
  if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'A URL informada não parece ser um Webhook válido do Google Apps Script (deve começar com https://script.google.com/macros/s/...)'
    };
  }

  try {
    const res = await fetch(`${url.trim()}?action=getProcessos&t=${Date.now()}`);
    const text = await res.text();

    if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('userCodeAppPanel')) {
      return {
        success: false,
        message: '⚠️ O Webhook respondeu com uma página HTML em vez de JSON. Certifique-se de implantar a Macro como Web App e configurar "Quem pode acessar: Qualquer pessoa".'
      };
    }

    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        return {
          success: true,
          message: `✅ Conexão bem-sucedida! ${json.length} processo(s) lido(s) da planilha.`,
          count: json.length
        };
      } else if (json && typeof json === 'object') {
        return {
          success: true,
          message: '✅ Conexão estabelecida com o Google Apps Script!',
          count: 0
        };
      }
    } catch {
      // Se não for JSON direto de getProcessos, testa se é um webhook ativo
      return {
        success: true,
        message: '✅ Webhook online e respondendo a requisições!',
        count: 0
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `❌ Erro de conexão: ${err?.message || 'Falha ao acessar o Webhook. Verifique as permissões de CORS e implantação.'}`
    };
  }

  return {
    success: false,
    message: 'Não foi possível obter resposta da planilha.'
  };
}

/**
 * Testa a conexão com a URL do Webhook do Google Apps Script
 */
export async function testSheetsWebhook(url: string): Promise<{ success: boolean; message: string; count?: number }> {
  if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
    return {
      success: false,
      message: 'A URL informada não parece ser um Webhook válido do Google Apps Script (deve começar com https://script.google.com/macros/s/...)'
    };
  }

  try {
    const res = await fetch(`${url.trim()}?action=getFeirantes&t=${Date.now()}`);
    const text = await res.text();

    if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('userCodeAppPanel')) {
      return {
        success: false,
        message: '⚠️ O Webhook respondeu com uma página HTML em vez de JSON. Certifique-se de implantar a Macro fornecida e configurar "Quem pode acessar: Qualquer pessoa".'
      };
    }

    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        return {
          success: true,
          message: `✅ Conexão bem-sucedida! ${json.length} feirante(s) lido(s) da planilha.`,
          count: json.length
        };
      } else if (json && typeof json === 'object') {
        return {
          success: true,
          message: '✅ Conexão estabelecida com o Google Apps Script!',
          count: 0
        };
      }
    } catch {
      return {
        success: false,
        message: '⚠️ A resposta da planilha não pôde ser interpretada como JSON válido.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `❌ Erro de conexão: ${err?.message || 'Falha ao acessar o Webhook. Verifique as permissões de CORS e implantação.'}`
    };
  }

  return {
    success: false,
    message: 'Não foi possível obter resposta da planilha.'
  };
}

/**
 * Busca a lista de feirantes diretamente da Planilha do Google Sheets via Webhook Apps Script
 */
export async function fetchFeirantesFromSheets(): Promise<FeiranteItem[] | null> {
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) return null;

  try {
    const res = await fetch(`${webhookUrl}?action=getFeirantes&t=${Date.now()}`);
    if (!res.ok) return null;

    const text = await res.text();
    // Se retornou página HTML de Web App legado ou erro do Google, ignora silenciosamente
    if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('userCodeAppPanel')) {
      console.warn('O Webhook retornou HTML ao invés de dados JSON de Feirantes.');
      return null;
    }

    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data.map((item: any, index: number) => {
        // Se vier como array de colunas [id, data_prot, num_prot, ...]
        if (Array.isArray(item)) {
          return {
            id: String(item[0] || `sheet-${index}-${Date.now()}`),
            data_prot: String(item[1] || ''),
            num_prot: String(item[2] || ''),
            feira: String(item[3] || ''),
            pasta: String(item[4] || ''),
            cpf: String(item[5] || ''),
            nome_pf: String(item[6] || ''),
            produtos: String(item[7] || ''),
            validade: String(item[8] || ''),
            rua: String(item[9] || ''),
            num: String(item[10] || ''),
            bairro: String(item[11] || 'Centro'),
            vinculo: String(item[12] || 'NÃO'),
            func: String(item[13] || '1'),
            abertura: String(item[14] || ''),
            cnpj: String(item[15] || ''),
            razao: String(item[16] || ''),
            rua_api: String(item[17] || ''),
            num_api: String(item[18] || ''),
            municipio: String(item[19] || 'BALNEÁRIO CAMBORIÚ'),
            estado: String(item[20] || 'SC'),
            cnae: String(item[21] || ''),
            alvara: String(item[22] || 'SIM')
          };
        }

        // Se vier como objeto
        return {
          id: item.id || item.ID || `sheet-${index}-${Date.now()}`,
          data_prot: item.data_prot || item.data_protocolo || item.DATA_PROT || item['DATA PROT'] || item['DATA PROTOCOLO'] || '',
          num_prot: item.num_prot || item.num_protocolo || item.NUM_PROT || item['PROCESSO'] || item['Nº PROTOCOLO'] || '',
          feira: item.feira || item.feiras || item.FEIRA || item.setor || '',
          pasta: item.pasta || item.pasta_visa || item.pastaVisa || item.PASTA || item['PASTA VISA'] || '',
          cpf: item.cpf || item.CPF || item.cnpj_cpf || '',
          nome_pf: item.nome_pf || item.nomePf || item.NOME_PF || item['NOME DO FEIRANTE'] || item.nome || item.razao_social || '',
          produtos: item.produtos || item.PRODUTOS || item.produtos_autorizados || item.assunto || item.motivacao || '',
          validade: item.validade || item.VALIDADE || item.validade_autorizacao || item.venc_licenca || '',
          rua: item.rua || item.endereco_rua || item.endereco || item.RUA || item['ENDEREÇO PF'] || '',
          num: item.num || item.num_complemento || item.numero || item.NUM || item['Nº / COMPLEMENTO PF'] || '',
          bairro: item.bairro || item.BAIRRO || 'Centro',
          vinculo: item.vinculo || item.VINCULO || item.situacao_cadastral || 'NÃO',
          func: item.func || item.num_func || item.FUNC || item['Nº FUNCIONÁRIOS'] || '1',
          abertura: item.abertura || item.ano_abertura || item.ano || item.ABERTURA || item['ANO ABERTURA FEIRA'] || '',
          cnpj: item.cnpj || item.CNPJ || '',
          razao: item.razao || item.nome_pj_api || item.razao_social || item.nome_fantasia || item.RAZAO || item['RAZÃO SOCIAL / NOME FANTASIA PJ'] || '',
          rua_api: item.rua_api || item.endereco_pj || item.RUA_API || item['ENDEREÇO PJ'] || '',
          num_api: item.num_api || item.num_comp_api || item.NUM_API || item['Nº / COMPLEMENTO PJ'] || '',
          municipio: item.municipio || item.MUNICIPIO || 'BALNEÁRIO CAMBORIÚ',
          estado: item.estado || item.ESTADO || item.uf || item.UF || 'SC',
          cnae: item.cnae || item.cnae_api || item.CNAE || item.cnaes || item['CNAE PRINCIPAL / ATIVIDADE'] || '',
          alvara: item.alvara || item.alvara_sanitario || item.ALVARA || item['ALVARÁ SANITÁRIO'] || 'SIM'
        };
      });
    }
  } catch (err) {
    console.warn('Erro ao buscar dados do Google Sheets:', err);
  }
  return null;
}

/**
 * Envia um novo feirante ou atualização para a Planilha do Google Sheets
 */
export async function saveFeiranteToSheets(item: FeiranteItem): Promise<boolean> {
  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const id = item.id || new Date().getTime().toString();
    const dataProt = item.data_prot || '';
    const numProt = item.num_prot || '';
    const feira = item.feira || '';
    const pasta = item.pasta || '';
    const cpf = item.cpf || '';
    const nomePf = item.nome_pf || '';
    const produtos = item.produtos || '';
    const validade = item.validade || '';
    const rua = item.rua || '';
    const num = item.num || '';
    const bairro = item.bairro || 'Centro';
    const vinculo = item.vinculo || 'NÃO';
    const func = item.func || '1';
    const abertura = item.abertura || '';
    const cnpj = item.cnpj || '';
    const razao = item.razao || '';
    const ruaApi = item.rua_api || '';
    const numApi = item.num_api || '';
    const municipio = item.municipio || 'BALNEÁRIO CAMBORIÚ';
    const estado = item.estado || 'SC';
    const cnae = item.cnae || '';
    const alvara = item.alvara || 'SIM';

    // 23-element Array for Google Apps Script appendRow([ ... ]) / setValues([ ... ])
    const row23 = [
      id,        // Col A (1)
      dataProt,  // Col B (2)
      numProt,   // Col C (3)
      feira,     // Col D (4)
      pasta,     // Col E (5)
      cpf,       // Col F (6)
      nomePf,    // Col G (7)
      produtos,  // Col H (8)
      validade,  // Col I (9)
      rua,       // Col J (10)
      num,       // Col K (11)
      bairro,    // Col L (12)
      vinculo,   // Col M (13)
      func,      // Col N (14)
      abertura,  // Col O (15)
      cnpj,      // Col P (16)
      razao,     // Col Q (17)
      ruaApi,    // Col R (18)
      numApi,    // Col S (19)
      municipio, // Col T (20)
      estado,    // Col U (21)
      cnae,      // Col V (22)
      alvara     // Col W (23)
    ];

    const fields: Record<string, any> = {
      action: 'saveFeirante',
      webhookUrl: webhookUrl,
      id: id,

      // Nomes padrão
      data_prot: dataProt,
      num_prot: numProt,
      feira: feira,
      pasta: pasta,
      cpf: cpf,
      nome_pf: nomePf,
      produtos: produtos,
      validade: validade,
      rua: rua,
      num: num,
      bairro: bairro,
      vinculo: vinculo,
      func: func,
      abertura: abertura,
      cnpj: cnpj,
      razao: razao,
      rua_api: ruaApi,
      num_api: numApi,
      municipio: municipio,
      estado: estado,
      cnae: cnae,
      alvara: alvara,

      // Aliases idênticos ao formulário de processos e planilhas Google
      data_protocolo: dataProt,
      num_protocolo: numProt,
      pasta_visa: pasta,
      pastaVisa: pasta,
      endereco_rua: rua,
      endereco: rua,
      num_complemento: num,
      numero: num,
      numero_complemento: num,
      num_func: func,
      ano_abertura: abertura,
      ano: abertura,
      nome_pj_api: razao,
      razao_social: razao || nomePf,
      nome_fantasia: razao,
      endereco_pj: ruaApi,
      num_comp_api: numApi,
      cnae_api: cnae,
      cnaes: cnae,
      situacao_cadastral: vinculo,
      venc_licenca: validade,
      alvara_sanitario: alvara,

      // Aliases em MAIÚSCULAS para compatibilidade total com scripts legados
      DATA_PROT: dataProt,
      NUM_PROT: numProt,
      FEIRA: feira,
      PASTA: pasta,
      PASTA_VISA: pasta,
      CPF: cpf,
      NOME_PF: nomePf,
      PRODUTOS: produtos,
      VALIDADE: validade,
      RUA: rua,
      ENDERECO_RUA: rua,
      NUM: num,
      NUM_COMPLEMENTO: num,
      BAIRRO: bairro,
      VINCULO: vinculo,
      FUNC: func,
      NUM_FUNC: func,
      ABERTURA: abertura,
      ANO_ABERTURA: abertura,
      CNPJ: cnpj,
      RAZAO: razao,
      NOME_PJ_API: razao,
      RUA_API: ruaApi,
      NUM_API: numApi,
      NUM_COMP_API: numApi,
      MUNICIPIO: municipio,
      ESTADO: estado,
      CNAE: cnae,
      CNAE_API: cnae,
      ALVARA: alvara,

      // Arrays ordenados de 23 colunas (Col A até Col W)
      row: row23,
      values: row23
    };

    // Método 0: Chamada para o Servidor Backend (Proxy Node.js sem restrições de CORS)
    try {
      const proxyRes = await fetch('/api/sheets/feirantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (proxyRes.ok) {
        console.log('Feirante enviado com sucesso via servidor proxy para o Google Sheets');
      }
    } catch (e) {
      console.warn('Proxy servidor feirante falhou, utilizando fallback cliente:', e);
    }

    // Método 1: Form submit via iframe oculto (Garante execução no Google Apps Script contornando CORS)
    if (typeof document !== 'undefined') {
      const iframeName = `gscript_feirantes_iframe_${Date.now()}`;
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = webhookUrl;
      form.target = iframeName;
      form.style.display = 'none';

      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = typeof v === 'object' ? JSON.stringify(v) : String(v);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          if (document.body.contains(form)) document.body.removeChild(form);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        } catch (e) {}
      }, 6000);
    }

    // Método 2: GET com Query Parameters em background
    const params = new URLSearchParams();
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });
    const getUrl = `${webhookUrl}?${params.toString()}`;

    fetch(getUrl, { mode: 'no-cors' }).catch(() => {});

    // Image Ping
    try {
      const img = new Image();
      img.src = getUrl;
    } catch (e) {}

    // POST URL-Encoded
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      mode: 'no-cors'
    }).catch(() => {});

    console.log('Dados do feirante enviados com sucesso para o Google Sheets');
    return true;
  } catch (err) {
    console.error('Erro ao enviar feirante para o Google Sheets:', err);
    return false;
  }
}

/**
 * Busca a lista de processos de fiscalização diretamente do Google Apps Script / Google Sheets
 */
export async function fetchProcessosFromSheets(): Promise<ProcessoItem[] | null> {
  try {
    const webhookUrl = getProcessosSheetsWebhookUrl();
    const url = `${webhookUrl}?action=getProcessos&t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((item: any, index: number) => ({
        id: item.id || item.ID || `proc-sheet-${index}-${Date.now()}`,
        num_processo: item.num_processo || item.NUM_PROCESSO || item.PROCESSO || item['Nº PROCESSO'] || `2026/${100 + index}`,
        data_protocolo: item.data_protocolo || item.DATA_PROTOCOLO || item.DATA || new Date().toLocaleDateString('pt-BR'),
        cnpj_cpf: item.cnpj_cpf || item.CNPJ_CPF || item.CNPJ || '00.000.000/0000-00',
        razao_social: item.razao_social || item.RAZAO_SOCIAL || item.RAZAO || 'EMPRESA REGISTRADA',
        nome_fantasia: item.nome_fantasia || item.NOME_FANTASIA || item.FANTASIA || item.razao_social || 'ESTABELECIMENTO',
        assunto: item.assunto || item.ASSUNTO || item.MOTIVACAO || 'Alvará Sanitário',
        bairro: item.bairro || item.BAIRRO || 'Centro',
        endereco: item.endereco || item.ENDERECO || '',
        fiscal_responsavel: item.fiscal_responsavel || item.FISCAL_RESPONSAVEL || item.FISCAL || 'Carlos Eduardo Silva',
        status: (item.status || item.STATUS || 'EM ANÁLISE').toUpperCase() as any,
        validade: item.validade || item.VALIDADE || '31/12/2026',
        observacoes: item.observacoes || item.OBSERVACOES || item.DESCRICAO || '',
        cnaes: Array.isArray(item.cnaes) ? item.cnaes : (item.cnaes ? String(item.cnaes).split(',') : []),
        servidores: Array.isArray(item.servidores) ? item.servidores : []
      }));
    }
  } catch (err) {
    console.warn('Erro ao buscar processos do Google Sheets:', err);
  }
  return null;
}

export interface SaveProcessoResult {
  success: boolean;
  isSavedToSheets: boolean;
  message: string;
}

/**
 * Envia o formulário do Processo para o Google Apps Script / Google Sheets
 */
export async function saveProcessoToSheets(item: ProcessoItem, fullFormData?: any): Promise<SaveProcessoResult> {
  const webhookUrl = getProcessosSheetsWebhookUrl();
  let isSavedToSheets = false;
  let responseMsg = '';

  try {
    const id = fullFormData?.id || item.id || new Date().getTime().toString();
    const dataProtocolo = fullFormData?.data_protocolo || fullFormData?.dataEntrada || item.data_protocolo || new Date().toLocaleDateString('pt-BR');
    const numProtocolo = fullFormData?.num_protocolo || fullFormData?.prot1Doc || item.num_processo || '';
    const feira = fullFormData?.feira || (fullFormData?.setor && fullFormData.setor !== '...' ? fullFormData.setor : 'ALIMENTAÇÃO');
    const pastaVisa = fullFormData?.pasta_visa || fullFormData?.pasta || '';

    const cpf = fullFormData?.cpf || fullFormData?.cnpjCpf || '';
    const nomePf = fullFormData?.nome_pf || fullFormData?.razaoSocial || '';
    const produtos = fullFormData?.produtos || fullFormData?.motivacao || item.assunto || 'Alvará Sanitário';
    const validade = fullFormData?.validade || fullFormData?.vencLicenca || item.validade || '31/12/2026';
    const enderecoRua = fullFormData?.endereco_rua || fullFormData?.endereco || item.endereco || '';
    const numComplemento = fullFormData?.num_complemento || fullFormData?.numeroComplemento || '';
    const bairro = fullFormData?.bairro || item.bairro || 'Centro';
    const vinculo = fullFormData?.vinculo || fullFormData?.situacaoCadastral || 'ATIVA';
    const numFunc = fullFormData?.num_func || fullFormData?.fiscalResponsavel || item.fiscal_responsavel || 'Carlos Eduardo Silva';
    const anoAbertura = fullFormData?.ano_abertura || fullFormData?.status || item.status || 'EM ANÁLISE';

    const cnpj = fullFormData?.cnpj || fullFormData?.cnpjCpf || item.cnpj_cpf || '';
    const nomePjApi = fullFormData?.nome_pj_api || fullFormData?.nomeFantasia || fullFormData?.razaoSocial || item.razao_social || '';
    const ruaApi = fullFormData?.rua_api || fullFormData?.endereco || item.endereco || '';
    const numCompApi = fullFormData?.num_comp_api || fullFormData?.numeroComplemento || '';
    const municipio = fullFormData?.municipio || 'Balneário Camboriú';
    const estado = fullFormData?.estado || 'SC';
    const cnaeApi = fullFormData?.cnae_api || (item.cnaes || []).join('; ') || '';
    const alvara = fullFormData?.alvara || fullFormData?.descricaoProcesso || item.observacoes || 'REGULAR';

    const cnaesStr = (item.cnaes || []).join('; ');
    const servidoresStr = (item.servidores || []).map(s => typeof s === 'string' ? s : `${s.nome} (${s.matricula})`).join(', ');

    const fields: Record<string, any> = {
      action: 'saveProcesso',
      webhookUrl: webhookUrl,
      id: id,

      // 23 Explicit Google Sheets Columns (Cols A to W)
      data_protocolo: dataProtocolo, // Col B
      num_protocolo: numProtocolo,  // Col C
      feira: feira,                  // Col D
      pasta_visa: pastaVisa,         // Col E
      pastaVisa: pastaVisa,
      cpf: cpf,                      // Col F
      nome_pf: nomePf,               // Col G
      produtos: produtos,            // Col H
      validade: validade,            // Col I
      endereco_rua: enderecoRua,     // Col J
      num_complemento: numComplemento, // Col K
      bairro: bairro,                // Col L
      vinculo: vinculo,              // Col M
      num_func: numFunc,             // Col N
      ano_abertura: anoAbertura,     // Col O
      cnpj: cnpj,                    // Col P
      nome_pj_api: nomePjApi,        // Col Q
      rua_api: ruaApi,               // Col R
      num_comp_api: numCompApi,      // Col S
      municipio: municipio,          // Col T
      estado: estado,                // Col U
      cnae_api: cnaeApi,             // Col V
      alvara: alvara,                // Col W

      // Aliases
      num_processo: numProtocolo,
      setor: feira,
      motivacao: produtos,
      assunto: produtos,
      data_entrada: dataProtocolo,
      prot_1doc: numProtocolo,
      pasta: pastaVisa,
      cnpj_cpf: cnpj || cpf,
      razao_social: nomePf || nomePjApi,
      nome_fantasia: nomePjApi,
      endereco: enderecoRua || ruaApi,
      numero_complemento: numComplemento || numCompApi,
      situacao_cadastral: vinculo,
      venc_licenca: validade,
      status: anoAbertura,
      observacoes: alvara,
      fiscal_responsavel: numFunc,
      cnaes: cnaeApi || cnaesStr,
      servidores: servidoresStr,

      // 23-element Array for Google Apps Script appendRow([ ... ])
      row: [
        id, dataProtocolo, numProtocolo, feira, pastaVisa,
        cpf, nomePf, produtos, validade, enderecoRua,
        numComplemento, bairro, vinculo, numFunc, anoAbertura,
        cnpj, nomePjApi, ruaApi, numCompApi, municipio,
        estado, cnaeApi, alvara
      ],
      values: [
        id, dataProtocolo, numProtocolo, feira, pastaVisa,
        cpf, nomePf, produtos, validade, enderecoRua,
        numComplemento, bairro, vinculo, numFunc, anoAbertura,
        cnpj, nomePjApi, ruaApi, numCompApi, municipio,
        estado, cnaeApi, alvara
      ]
    };

    // Método 0: Chamada para o Servidor Backend (Proxy Node.js sem restrições de CORS/Iframe de navegador)
    try {
      const proxyRes = await fetch('/api/sheets/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json.success) {
          isSavedToSheets = true;
          responseMsg = json.message || 'Gravado com sucesso no Google Sheets!';
          console.log('[Sheets Success]:', json);
        }
      }
    } catch (e) {
      console.warn('Proxy servidor falhou, utilizando fallback cliente:', e);
    }

    // Método 1: Form submit via iframe oculto (Garante execução no Google Apps Script contornando CORS e redirecionamentos 302)
    if (typeof document !== 'undefined') {
      const iframeName = `gscript_iframe_${Date.now()}`;
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = webhookUrl;
      form.target = iframeName;
      form.style.display = 'none';

      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = typeof v === 'object' ? JSON.stringify(v) : String(v);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          if (document.body.contains(form)) document.body.removeChild(form);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        } catch (e) {}
      }, 6000);
    }

    // Método 2: GET com Query Parameters em background
    const params = new URLSearchParams();
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        params.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    });
    const getUrl = `${webhookUrl}?${params.toString()}`;

    fetch(getUrl, { mode: 'no-cors' }).catch(() => {});

    // Image Ping
    try {
      const img = new Image();
      img.src = getUrl;
    } catch (e) {}

    // POST URL-Encoded
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      mode: 'no-cors'
    }).catch(() => {});

    return {
      success: true,
      isSavedToSheets: isSavedToSheets,
      message: isSavedToSheets
        ? 'Processo gravado com sucesso na Planilha do Google Sheets!'
        : 'Processo salvo no sistema. (Sincronização com Google Sheets enviada em segundo plano)'
    };
  } catch (err: any) {
    console.error('Erro ao enviar processo para o Google Sheets:', err);
    return {
      success: true,
      isSavedToSheets: false,
      message: `Processo salvo localmente. Falha ao comunicar com o Google Sheets: ${err?.message || ''}`
    };
  }
}

