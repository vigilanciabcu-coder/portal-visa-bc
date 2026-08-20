export interface CnpjData {
  razao: string;
  nome_fantasia: string;
  municipio: string;
  estado: string;
  rua_api: string;
  num_api: string;
  bairro: string;
  cnae: string;
  cnaes?: string[];
  responsavel: string;
  telefone: string;
  tipo_atividade: string;
  risco: 'BAIXO' | 'MÉDIO' | 'ALTO';
  situacao?: string;
}

function formatCnae(code: string | number | undefined, desc: string | undefined): string {
  if (!code && !desc) return '';
  const strCode = String(code || '').replace(/\D/g, '');
  let formattedCode = strCode;
  if (strCode.length === 7) {
    formattedCode = `${strCode.slice(0, 4)}-${strCode[4]}/${strCode.slice(5)}`;
  }
  return desc ? `${formattedCode} - ${desc.toUpperCase().trim()}` : formattedCode;
}

function classifyActivity(desc: string): { tipo: string; risco: 'BAIXO' | 'MÉDIO' | 'ALTO' } {
  const d = desc.toLowerCase();
  if (d.includes('feira') || d.includes('ambulante')) {
    return { tipo: 'Feira Livre / Ambulante', risco: 'MÉDIO' };
  }
  if (d.includes('supermercado') || d.includes('açougue') || d.includes('acougue') || d.includes('hipermercado')) {
    return { tipo: 'Supermercado / Açougue', risco: 'ALTO' };
  }
  if (d.includes('drogaria') || d.includes('farmácia') || d.includes('farmacia') || d.includes('medicament')) {
    return { tipo: 'Drogaria / Farmácia', risco: 'MÉDIO' };
  }
  if (d.includes('hotel') || d.includes('pousada') || d.includes('hospedagem')) {
    return { tipo: 'Hotel / Pousada', risco: 'MÉDIO' };
  }
  if (d.includes('estética') || d.includes('estetica') || d.includes('salão') || d.includes('salao') || d.includes('cabeleireiro')) {
    return { tipo: 'Estética / Salão', risco: 'MÉDIO' };
  }
  if (d.includes('lanchonete') || d.includes('pastel') || d.includes('suco') || d.includes('padaria') || d.includes('confeitaria') || d.includes('panificadora')) {
    return { tipo: 'Lanchonete / Fast Food', risco: 'BAIXO' };
  }
  return { tipo: 'Restaurante / Alimentação', risco: 'MÉDIO' };
}

export async function fetchCnpj(cleanCnpj: string): Promise<CnpjData> {
  const cleanVal = cleanCnpj.replace(/\D/g, '');
  if (!cleanVal) {
    throw new Error('CNPJ inválido');
  }

  // 1. Tenta o servidor backend local /api/cnpj primeiro
  try {
    const res = await fetch(`/api/cnpj/${cleanVal}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.razao) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Servidor local /api/cnpj indisponível, tentando APIs públicas diretamente:', e);
  }

  // 2. Fallback direto no cliente para Minhareceita.org (CORS permitido no navegador)
  try {
    const mRes = await fetch(`https://minhareceita.org/${cleanVal}`);
    if (mRes.ok) {
      const d = await mRes.json();
      const primaryCnae = formatCnae(d.cnae_fiscal, d.cnae_fiscal_descricao);
      const secCnaes = Array.isArray(d.cnaes_secundarios)
        ? d.cnaes_secundarios.map((i: any) => formatCnae(i.cnae || i.codigo, i.descricao)).filter(Boolean)
        : [];
      const allCnaes = [primaryCnae, ...secCnaes].filter(Boolean);

      const cnaeDesc = d.cnae_fiscal_descricao || 'Alimentação e Serviços';
      const { tipo, risco } = classifyActivity(cnaeDesc);
      const logradouroTipo = d.descricao_tipo_de_logradouro ? `${d.descricao_tipo_de_logradouro} ` : '';
      const rua = `${logradouroTipo}${d.logradouro || ''}`.trim() || 'AVENIDA BRASIL';

      const tel = d.ddd_telefone_1 
        ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` 
        : '(47) 3367-0000';
      const sit = d.descricao_situacao_cadastral || d.situacao_cadastral || d.descricao_situacao || d.situacao || 'ATIVA';

      return {
        razao: d.razao_social || d.nome_fantasia || `ESTABELECIMENTO (${cleanVal}) LTDA`,
        nome_fantasia: d.nome_fantasia || d.razao_social || `ESTABELECIMENTO (${cleanVal})`,
        municipio: d.municipio || 'BALNEÁRIO CAMBORIÚ',
        estado: d.uf || 'SC',
        rua_api: rua,
        num_api: d.numero || '100',
        bairro: d.bairro || 'Centro',
        cnae: cnaeDesc,
        cnaes: allCnaes.length > 0 ? allCnaes : [primaryCnae || cnaeDesc],
        responsavel: d.qsa?.[0]?.nome_socio || 'RESPONSÁVEL CADASTRADO',
        telefone: tel,
        tipo_atividade: tipo,
        risco,
        situacao: String(sit).toUpperCase()
      };
    }
  } catch (e) {
    console.warn('Minhareceita erro:', e);
  }

  // 3. Fallback direto no cliente para BrasilAPI
  try {
    const bRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanVal}`);
    if (bRes.ok) {
      const d = await bRes.json();
      const primaryCnae = formatCnae(d.cnae_fiscal, d.cnae_fiscal_descricao);
      const secCnaes = Array.isArray(d.cnaes_secundarios)
        ? d.cnaes_secundarios.map((i: any) => formatCnae(i.code || i.codigo || i.cnae, i.descricao)).filter(Boolean)
        : [];
      const allCnaes = [primaryCnae, ...secCnaes].filter(Boolean);

      const cnaeDesc = d.cnae_fiscal_descricao || 'Alimentação e Serviços';
      const { tipo, risco } = classifyActivity(cnaeDesc);
      const logradouroTipo = d.descricao_tipo_de_logradouro ? `${d.descricao_tipo_de_logradouro} ` : '';
      const rua = `${logradouroTipo}${d.logradouro || ''}`.trim() || 'AVENIDA BRASIL';

      const tel = d.ddd_telefone_1 
        ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` 
        : '(47) 3367-0000';
      const sit = d.descricao_situacao_cadastral || d.situacao_cadastral || d.descricao_situacao || d.situacao || 'ATIVA';

      return {
        razao: d.razao_social || d.nome_fantasia || `ESTABELECIMENTO (${cleanVal}) LTDA`,
        nome_fantasia: d.nome_fantasia || d.razao_social || `ESTABELECIMENTO (${cleanVal})`,
        municipio: d.municipio || 'BALNEÁRIO CAMBORIÚ',
        estado: d.uf || 'SC',
        rua_api: rua,
        num_api: d.numero || '100',
        bairro: d.bairro || 'Centro',
        cnae: cnaeDesc,
        cnaes: allCnaes.length > 0 ? allCnaes : [primaryCnae || cnaeDesc],
        responsavel: d.qsa?.[0]?.nome_socio || 'RESPONSÁVEL CADASTRADO',
        telefone: tel,
        tipo_atividade: tipo,
        risco,
        situacao: String(sit).toUpperCase()
      };
    }
  } catch (e) {
    console.warn('BrasilAPI erro:', e);
  }

  // Fallback padrão dinâmico sem hardcode de "RESTAURANTE E GASTRONOMIA BC"
  return {
    razao: `ESTABELECIMENTO (${cleanVal}) LTDA`,
    nome_fantasia: `ESTABELECIMENTO (${cleanVal})`,
    municipio: 'BALNEÁRIO CAMBORIÚ',
    estado: 'SC',
    rua_api: 'AVENIDA BRASIL',
    num_api: '100',
    bairro: 'Centro',
    cnae: '5611-2/01 Alimentação',
    responsavel: 'PROPRIETÁRIO CADASTRADO',
    telefone: '(47) 3367-0000',
    tipo_atividade: 'Restaurante / Alimentação',
    risco: 'MÉDIO',
    situacao: 'ATIVA'
  };
}
