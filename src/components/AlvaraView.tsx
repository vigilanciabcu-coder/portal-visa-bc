import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlvaraSanitarioItem,
  UserProfile,
  ProcessoItem,
  ModeloAlvaraDocsItem,
  TipoAlvara,
  StatusAlvara
} from '../types';
import { fetchCnpj } from '../lib/cnpjService';
import {
  fetchAlvarasFromSupabase,
  saveAlvaraToSupabase,
  deleteAlvaraFromSupabase,
  fetchModelosAlvaraFromSupabase,
  saveModeloAlvaraToSupabase,
  isSupabaseConfigured
} from '../lib/supabaseService';

// Subcomponentes Modulares do Alvará
import {
  ModeloAlvaraDef,
  AlvaraModuleType,
  MODELOS_DISPONIVEIS,
  MODELOS_DOCS_INICIAIS,
  formatAlvaraDataForDocs,
  getGoogleDocsEditUrl,
  isUserMaster
} from './alvara/alvaraUtils';
import { AlvaraHeader } from './alvara/AlvaraHeader';
import { AlvaraModuleNav } from './alvara/AlvaraModuleNav';
import { AlvaraConsultaModule } from './alvara/AlvaraConsultaModule';
import { AlvaraCadastroModule } from './alvara/AlvaraCadastroModule';
import { AlvaraDocsModule } from './alvara/AlvaraDocsModule';
import { AlvaraPastasModule } from './alvara/AlvaraPastasModule';
import { AlvaraPrintModal } from './alvara/AlvaraPrintModal';
import { AlvaraPasswordModal } from './alvara/AlvaraPasswordModal';

export * from './alvara/alvaraUtils';

interface AlvaraViewProps {
  onBack: () => void;
  currentUser: UserProfile | null;
  processos?: ProcessoItem[];
}

export function AlvaraView({ onBack, currentUser, processos = [] }: AlvaraViewProps) {
  const isMaster = isUserMaster(currentUser);

  // Lista de Alvarás

  const [alvaras, setAlvaras] = useState<AlvaraSanitarioItem[]>(() => {
    const saved = localStorage.getItem('visa_alvaras_cadastrados');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'alv-seed-milho',
        numero_alvara: 'ALV-2026/00142',
        ano_exercicio: '2026',
        tipo_alvara: 'RENOVAÇÃO',
        modelo_tipo: 'PONTO_MILHO_CHURROS',
        pasta: 'PASTA 204/MILHO',
        cnpj_cpf: '04.892.110/0001-22',
        razao_social: 'JOÃO BATISTA DA SILVA ME',
        nome_fantasia: 'MILHO & CHURRO DA BARRA',
        endereco: 'AVENIDA ATLÂNTICA (PONTO Nº 12)',
        numero: 'S/N',
        complemento: 'QUIOSQUE VOLANTE 12',
        bairro: 'CENTRO',
        municipio: 'Balneário Camboriú',
        cep: '88330-000',
        cnae_principal: '5612-1/00 - SERVIÇOS AMBULANTES DE ALIMENTAÇÃO',
        cnaes_secundarios: ['5611-2/03 - LANCHONETES, CASAS DE CHÁ, DE SUCOS E SIMILARES'],
        responsavel_tecnico: '',
        conselho_rt: '',
        validade: '2027-03-31',
        data_emissao: '2026-03-10',
        status: 'ATIVO',
        setor: 'ALIMENTOS',
        condicionantes: 'Alvará concedido estritamente para o ponto e carrinho vistoriado. Obrigatório uso de vestimenta adequada, proteção dos alimentos contra intempéries, recipientes higienizados e manutenção da licença visível.',
        fiscal_emissor: currentUser?.nome_completo || 'FISCAL SANITÁRIO DVIS',
        matricula_fiscal: currentUser?.matricula || 'MAT-4921',
        codigo_autenticacao: 'BC-VISA-2026-MILHO-9A8B',
        assinatura_digital: `Validado administrativamente por ${currentUser?.nome_completo || 'EQUIPE DVIS'} em 10/03/2026 às 09:15, via classificação de risco sanitário.`,
        assinado_por: currentUser?.nome_completo || 'EQUIPE DVIS',
        assinado_em: '10/03/2026 às 09:15',
        modelo_doc_url: MODELOS_DISPONIVEIS[0].docsUrl,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      },
      {
        id: 'alv-seed-feirante',
        numero_alvara: 'ALV-2026/00143',
        ano_exercicio: '2026',
        tipo_alvara: 'INICIAL',
        modelo_tipo: 'FEIRANTE',
        pasta: 'PASTA 89/FEIRA-200',
        cnpj_cpf: '83.102.285/0001-07',
        razao_social: 'MARIA CLARA DOS SANTOS FEIRANTE',
        nome_fantasia: 'PASTÉIS E CALDO DE CANA DA FEIRA',
        endereco: 'RUA 200 (FEIRA MUNICIPAL)',
        numero: 'BOX 18',
        complemento: 'FEIRA QUARTA E SÁBADO',
        bairro: 'CENTRO',
        municipio: 'Balneário Camboriú',
        cep: '88330-015',
        cnae_principal: '4729-6/99 - COMÉRCIO VAREJISTA DE PRODUTOS ALIMENTÍCIOS EM GERAL (FEIRANTE)',
        cnaes_secundarios: ['5612-1/00 - SERVIÇOS AMBULANTES DE ALIMENTAÇÃO'],
        responsavel_tecnico: '',
        conselho_rt: '',
        validade: '2027-03-31',
        data_emissao: '2026-03-12',
        status: 'ATIVO',
        setor: 'ALIMENTOS',
        condicionantes: 'Obrigatória a exposição deste alvará em local visível na barraca da feira. Cumprimento das normas de higiene e controle térmico dos insumos.',
        fiscal_emissor: currentUser?.nome_completo || 'FISCAL SANITÁRIO DVIS',
        matricula_fiscal: currentUser?.matricula || 'MAT-4921',
        codigo_autenticacao: 'BC-VISA-2026-FEIRA-4C2E',
        assinatura_digital: `Validado administrativamente por ${currentUser?.nome_completo || 'EQUIPE DVIS'} em 12/03/2026 às 14:30, via classificação de risco sanitário.`,
        assinado_por: currentUser?.nome_completo || 'EQUIPE DVIS',
        assinado_em: '12/03/2026 às 14:30',
        modelo_doc_url: MODELOS_DISPONIVEIS[1].docsUrl,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }
    ];
  });

  // Módulo Operacional Ativo (Navegação em Botões)
  const [activeModule, setActiveModule] = useState<AlvaraModuleType>('consultar');

  // Filtros de Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [modeloFilter, setModeloFilter] = useState<string>('TODOS');
  const [selectedPastaFilter, setSelectedPastaFilter] = useState<string | null>(null);

  // Link do Google Docs Oficial Geral (Persistido no localStorage)
  const [googleDocsTemplateUrl, setGoogleDocsTemplateUrl] = useState<string>(() => {
    return localStorage.getItem('visa_google_docs_template_url') || MODELOS_DISPONIVEIS[0].docsUrl;
  });

  // Lista dos Modelos Salvos
  const [modelosDocs, setModelosDocs] = useState<ModeloAlvaraDocsItem[]>(() => {
    const saved = localStorage.getItem('visa_modelos_docs_salvos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return MODELOS_DOCS_INICIAIS;
  });

  const [selectedModeloDocsId, setSelectedModeloDocsId] = useState<string>(() => {
    return localStorage.getItem('visa_modelo_docs_ativo') || 'modelo_proposto_diretoria';
  });

  // Feedback Messages
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);

  // Modal de Impressão e Visualização do Alvará
  const [selectedAlvaraForPrint, setSelectedAlvaraForPrint] = useState<AlvaraSanitarioItem | null>(null);
  const [printViewMode, setPrintViewMode] = useState<'docs_embed' | 'timbrado'>('docs_embed');

  // Modelo Selecionado para Formulário de Cadastro
  const [selectedModelo, setSelectedModelo] = useState<ModeloAlvaraDef>(MODELOS_DISPONIVEIS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário: os 9 Campos Principais + Complementares
  const [categoriaInput, setCategoriaInput] = useState<'PONTO_MILHO_CHURROS' | 'FEIRANTE' | 'GERAL'>('PONTO_MILHO_CHURROS');
  const [numeroAlvaraInput, setNumeroAlvaraInput] = useState('');
  const [anoExercicioInput, setAnoExercicioInput] = useState<number>(new Date().getFullYear());
  const [razaoSocialInput, setRazaoSocialInput] = useState('');
  const [cnpjCpfInput, setCnpjCpfInput] = useState('');
  const [nomeFantasiaInput, setNomeFantasiaInput] = useState('');
  const [enderecoInput, setEnderecoInput] = useState('');
  const [numeroComplementoInput, setNumeroComplementoInput] = useState('');
  const [bairroInput, setBairroInput] = useState('');
  const [cepInput, setCepInput] = useState('');
  const [dataEmissaoInput, setDataEmissaoInput] = useState(new Date().toISOString().split('T')[0]);
  const [pastaInput, setPastaInput] = useState('');
  const [validadeInput, setValidadeInput] = useState('');
  const [cnaePrincipalInput, setCnaePrincipalInput] = useState('');
  const [condicionantesInput, setCondicionantesInput] = useState('');
  const [modeloDocUrlInput, setModeloDocUrlInput] = useState('');
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  // Modal de Senha & Assinatura Digital
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // Carregar do Supabase se configurado
  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchAlvarasFromSupabase().then((data) => {
        if (data && data.length > 0) {
          setAlvaras(data);
          localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(data));
        }
      });
      fetchModelosAlvaraFromSupabase().then((modelosData) => {
        if (modelosData && modelosData.length > 0) {
          setModelosDocs(modelosData);
          localStorage.setItem('visa_modelos_docs_salvos', JSON.stringify(modelosData));
          const ativo = modelosData.find((m) => m.is_ativo);
          if (ativo) {
            setSelectedModeloDocsId(ativo.id);
            localStorage.setItem('visa_modelo_docs_ativo', ativo.id);
          }
        }
      }).catch(console.warn);
    }
  }, []);

  // Salvar no localStorage sempre que os alvarás mudarem
  useEffect(() => {
    localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(alvaras));
  }, [alvaras]);

  // Agrupamento por Pasta Física
  const pastasAgrupadas = useMemo(() => {
    const map: Record<string, AlvaraSanitarioItem[]> = {};
    alvaras.forEach((a) => {
      const p = a.pasta?.trim().toUpperCase() || 'SEM PASTA';
      if (!map[p]) map[p] = [];
      map[p].push(a);
    });
    return map;
  }, [alvaras]);

  // Gerar número sequencial
  const generateNewAlvaraNumber = (prefixo = 'ALV') => {
    const year = new Date().getFullYear();
    const count = alvaras.filter((a) => a.ano_exercicio === String(year)).length + 1;
    return `${prefixo}-${year}/${String(count).padStart(5, '0')}`;
  };

  const calculateDefaultValidity = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  // Salvar URL global do Google Docs
  const handleSaveGlobalDocsUrl = (url: string) => {
    const trimmed = url.trim();
    setGoogleDocsTemplateUrl(trimmed);
    localStorage.setItem('visa_google_docs_template_url', trimmed);
  };

  // Aplicar URL do Google Docs a TODOS os alvarás cadastrados
  const handleApplyUrlToAllAlvaras = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    handleSaveGlobalDocsUrl(trimmed);

    const updated = alvaras.map((a) => ({
      ...a,
      modelo_doc_url: trimmed,
      atualizado_em: new Date().toISOString()
    }));
    setAlvaras(updated);
    localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      Promise.all(updated.map((item) => saveAlvaraToSupabase(item))).catch(console.warn);
    }

    if (selectedAlvaraForPrint) {
      setSelectedAlvaraForPrint({ ...selectedAlvaraForPrint, modelo_doc_url: trimmed });
    }
  };

  // Atualizar URL de um alvará específico
  const handleUpdateAlvaraDocUrl = (alvaraId: string, newUrl: string) => {
    const updated = alvaras.map((a) => (a.id === alvaraId ? { ...a, modelo_doc_url: newUrl } : a));
    setAlvaras(updated);
    localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(updated));
    if (selectedAlvaraForPrint && selectedAlvaraForPrint.id === alvaraId) {
      setSelectedAlvaraForPrint({ ...selectedAlvaraForPrint, modelo_doc_url: newUrl });
    }
  };

  // Abertura do visualizador
  const handleOpenViewer = (alv: AlvaraSanitarioItem, mode: 'docs_embed' | 'timbrado' = 'docs_embed') => {
    setSelectedAlvaraForPrint(alv);
    setPrintViewMode(mode);
  };

  // Busca rápida de dados e geração instantânea de Alvará em PDF (Google Docs)
  const handleQuickSearchAndGeneratePdf = async (query: string) => {
    const cleanQ = query.toLowerCase().trim();
    const cleanNum = query.replace(/\D/g, '');

    // 1. Procurar na lista de alvarás já emitidos
    const foundAlvara = alvaras.find((a) => {
      if (a.numero_alvara.toLowerCase().includes(cleanQ)) return true;
      if (cleanNum && a.cnpj_cpf.replace(/\D/g, '').includes(cleanNum)) return true;
      if (a.razao_social.toLowerCase().includes(cleanQ)) return true;
      if (a.nome_fantasia && a.nome_fantasia.toLowerCase().includes(cleanQ)) return true;
      return false;
    });

    if (foundAlvara) {
      handleOpenViewer(foundAlvara, 'docs_embed');
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Alvará nº ${foundAlvara.numero_alvara} localizado! Pronto para emissão e download em PDF.`
      });
      return;
    }

    // 2. Procurar na lista de processos administrativos (1Doc / Vigilância Sanitária)
    const matchingProcesso = processos.find((p) => {
      if (cleanNum && p.cnpj_cpf.replace(/\D/g, '').includes(cleanNum)) return true;
      if (p.num_processo.toLowerCase().includes(cleanQ)) return true;
      if (p.razao_social && p.razao_social.toLowerCase().includes(cleanQ)) return true;
      return false;
    });

    if (matchingProcesso) {
      const year = String(new Date().getFullYear());
      const token = `BC-VISA-${year}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const autoAlvara: AlvaraSanitarioItem = {
        id: `alv-proc-${matchingProcesso.id || Date.now()}`,
        numero_alvara: generateNewAlvaraNumber(),
        ano_exercicio: year,
        tipo_alvara: 'INICIAL',
        modelo_tipo: 'GERAL',
        pasta: `PROCESSO ${matchingProcesso.num_processo}`,
        cnpj_cpf: matchingProcesso.cnpj_cpf,
        razao_social: (matchingProcesso.razao_social || 'ESTABELECIMENTO').toUpperCase(),
        nome_fantasia: (matchingProcesso.nome_fantasia || matchingProcesso.razao_social || '').toUpperCase(),
        endereco: (matchingProcesso.endereco || 'BALNEÁRIO CAMBORIÚ').toUpperCase(),
        numero: 'S/N',
        complemento: '',
        bairro: (matchingProcesso.bairro || 'CENTRO').toUpperCase(),
        municipio: 'Balneário Camboriú',
        cep: matchingProcesso.cep || '88330-000',
        cnae_principal: matchingProcesso.cnae || 'COMÉRCIO / SERVIÇOS',
        validade: calculateDefaultValidity(),
        data_emissao: new Date().toISOString().split('T')[0],
        status: 'ATIVO',
        setor: 'GERAL',
        condicionantes: `Alvará sanitário deferido e expedido com base no Processo Administrativo nº ${matchingProcesso.num_processo}.`,
        fiscal_emissor: currentUser?.nome_completo || 'FISCAL SANITÁRIO DVIS',
        matricula_fiscal: currentUser?.matricula || 'MAT-4921',
        codigo_autenticacao: token,
        assinatura_digital: `Validado administrativamente para emissão em ${new Date().toLocaleDateString('pt-BR')}`,
        assinado_por: currentUser?.nome_completo || 'DVIS',
        assinado_em: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        modelo_doc_url: googleDocsTemplateUrl,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };

      const updated = [autoAlvara, ...alvaras];
      setAlvaras(updated);
      localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(updated));
      if (isSupabaseConfigured) {
        saveAlvaraToSupabase(autoAlvara).catch(console.warn);
      }

      handleOpenViewer(autoAlvara, 'docs_embed');
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Dados encontrados no Processo nº ${matchingProcesso.num_processo}! Alvará gerado e pronto em PDF.`
      });
      return;
    }

    // 3. Se for CNPJ de 14 dígitos, buscar dados na Receita Federal
    if (cleanNum.length === 14) {
      try {
        const cnpjData = await fetchCnpj(cleanNum);
        if (cnpjData && cnpjData.razao) {
          const year = String(new Date().getFullYear());
          const token = `BC-VISA-${year}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
          const formattedCnpj = cleanNum.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
          const autoAlvara: AlvaraSanitarioItem = {
            id: `alv-cnpj-${Date.now()}`,
            numero_alvara: generateNewAlvaraNumber(),
            ano_exercicio: year,
            tipo_alvara: 'INICIAL',
            modelo_tipo: 'GERAL',
            pasta: 'RECEITA FEDERAL',
            cnpj_cpf: formattedCnpj,
            razao_social: (cnpjData.razao || '').toUpperCase(),
            nome_fantasia: (cnpjData.nome_fantasia || cnpjData.razao || '').toUpperCase(),
            endereco: (cnpjData.rua_api || 'ENDEREÇO CADASTRAL').toUpperCase(),
            numero: (cnpjData.num_api || 'S/N').toUpperCase(),
            complemento: '',
            bairro: (cnpjData.bairro || 'CENTRO').toUpperCase(),
            municipio: 'Balneário Camboriú',
            cep: cnpjData.cep || '88330-000',
            cnae_principal: cnpjData.cnae || 'ATIVIDADE ECONÔMICA',
            validade: calculateDefaultValidity(),
            data_emissao: new Date().toISOString().split('T')[0],
            status: 'ATIVO',
            setor: 'GERAL',
            condicionantes: 'Alvará emitido a partir da consulta cadastral direta à base de dados oficial.',
            fiscal_emissor: currentUser?.nome_completo || 'FISCAL SANITÁRIO DVIS',
            matricula_fiscal: currentUser?.matricula || 'MAT-4921',
            codigo_autenticacao: token,
            assinatura_digital: `Validado cadastralmente em ${new Date().toLocaleDateString('pt-BR')}`,
            assinado_por: currentUser?.nome_completo || 'DVIS',
            assinado_em: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            modelo_doc_url: googleDocsTemplateUrl,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          };

          const updated = [autoAlvara, ...alvaras];
          setAlvaras(updated);
          localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(updated));
          if (isSupabaseConfigured) {
            saveAlvaraToSupabase(autoAlvara).catch(console.warn);
          }

          handleOpenViewer(autoAlvara, 'docs_embed');
          setFeedbackMsg({
            tipo: 'sucesso',
            texto: `Dados do CNPJ ${formattedCnpj} obtidos na Receita! Alvará gerado e pronto em PDF.`
          });
          return;
        }
      } catch (err) {
        console.warn('Erro ao consultar CNPJ externo:', err);
      }
    }

    setFeedbackMsg({
      tipo: 'erro',
      texto: `Nenhum registro encontrado para "${query}". Verifique o CPF/CNPJ ou cadastre pelo botão 'Cadastrar & Emitir'.`
    });
  };

  // Seleção rápida de modelo para cadastro
  const handleSelectModeloParaCadastro = (modelo: ModeloAlvaraDef) => {
    setSelectedModelo(modelo);
    setCategoriaInput(modelo.id as any);
    setEditingId(null);
    setNumeroAlvaraInput(generateNewAlvaraNumber());
    setAnoExercicioInput(new Date().getFullYear());
    setRazaoSocialInput('');
    setCnpjCpfInput('');
    setNomeFantasiaInput('');
    setEnderecoInput('');
    setNumeroComplementoInput('');
    setBairroInput('');
    setCepInput('88330-000');
    setDataEmissaoInput(new Date().toISOString().split('T')[0]);
    setPastaInput('');
    setCnaePrincipalInput(modelo.cnaeSugerido);
    setValidadeInput(calculateDefaultValidity());
    setCondicionantesInput(modelo.condicionantesPadrao);
    setModeloDocUrlInput(googleDocsTemplateUrl || modelo.docsUrl);

    setActiveModule('cadastrar');
    setFeedbackMsg(null);
  };

  // Editar alvará existente
  const handleEditAlvara = (item: AlvaraSanitarioItem) => {
    const found = MODELOS_DISPONIVEIS.find((m) => m.id === item.modelo_tipo) || MODELOS_DISPONIVEIS[0];
    setSelectedModelo(found);
    setCategoriaInput(item.modelo_tipo as any);
    setEditingId(item.id);
    setNumeroAlvaraInput(item.numero_alvara);
    setAnoExercicioInput(Number(item.ano_exercicio) || new Date().getFullYear());
    setRazaoSocialInput(item.razao_social);
    setCnpjCpfInput(item.cnpj_cpf);
    setNomeFantasiaInput(item.nome_fantasia || '');
    setEnderecoInput(item.endereco);
    setNumeroComplementoInput(item.numero + (item.complemento ? ` / ${item.complemento}` : ''));
    setBairroInput(item.bairro);
    setCepInput(item.cep || '');
    setDataEmissaoInput(item.data_emissao);
    setPastaInput(item.pasta || '');
    setCnaePrincipalInput(item.cnae_principal);
    setValidadeInput(item.validade);
    setCondicionantesInput(item.condicionantes || '');
    setModeloDocUrlInput(item.modelo_doc_url || googleDocsTemplateUrl);

    setActiveModule('cadastrar');
  };

  // Excluir alvará
  const handleDeleteAlvara = async (id: string, numero: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o Alvará Sanitário nº ${numero}?`)) return;
    const updated = alvaras.filter((a) => a.id !== id);
    setAlvaras(updated);
    if (isSupabaseConfigured) {
      deleteAlvaraFromSupabase(id).catch(console.warn);
    }
    setFeedbackMsg({ tipo: 'sucesso', texto: `Alvará ${numero} removido com sucesso.` });
  };

  // Copiar dados dos 9 campos
  const handleCopyDataForDocs = (alv: AlvaraSanitarioItem) => {
    const formatted = formatAlvaraDataForDocs(alv);
    navigator.clipboard.writeText(formatted);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Dados do alvará nº ${alv.numero_alvara} copiados com sucesso!`
    });
  };

  // Consulta CNPJ / CPF
  const handleConsultarCnpjCpf = async () => {
    const clean = cnpjCpfInput.replace(/\D/g, '');
    if (!clean) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe o CPF ou CNPJ para consulta.' });
      return;
    }
    setLoadingCnpj(true);
    setFeedbackMsg(null);
    try {
      const foundProcesso = processos.find((p) => p.cnpj_cpf.replace(/\D/g, '') === clean);
      if (foundProcesso) {
        setRazaoSocialInput(foundProcesso.razao_social || '');
        setNomeFantasiaInput(foundProcesso.nome_fantasia || '');
        setEnderecoInput(foundProcesso.endereco || '');
        setBairroInput(foundProcesso.bairro || '');
        if (foundProcesso.cep) setCepInput(foundProcesso.cep);
        if (foundProcesso.cnae) setCnaePrincipalInput(foundProcesso.cnae);
        if (foundProcesso.num_processo) setPastaInput(`PROCESSO ${foundProcesso.num_processo}`);
        setFeedbackMsg({
          tipo: 'sucesso',
          texto: `Dados encontrados na Carteira de Processos (${foundProcesso.num_processo})!`
        });
      }

      if (clean.length === 14) {
        const data = await fetchCnpj(clean);
        if (data) {
          if (!razaoSocialInput) setRazaoSocialInput(data.razao || '');
          if (!nomeFantasiaInput) setNomeFantasiaInput(data.nome_fantasia || data.razao || '');
          if (!enderecoInput) setEnderecoInput(data.rua_api || '');
          if (!numeroComplementoInput) setNumeroComplementoInput(data.num_api || 'S/N');
          if (!bairroInput) setBairroInput(data.bairro || '');
          if (!cepInput) setCepInput(data.cep || '');
          if (!cnaePrincipalInput) setCnaePrincipalInput(data.cnae || '');
          setFeedbackMsg({
            tipo: 'sucesso',
            texto: `Dados cadastrais do CNPJ ${clean} validados na Receita Federal!`
          });
        }
      }
    } catch (e: any) {
      console.warn('Erro ao consultar CPF/CNPJ:', e);
      setFeedbackMsg({ tipo: 'erro', texto: 'Não foi possível puxar os dados automaticamente.' });
    } finally {
      setLoadingCnpj(false);
    }
  };

  // Iniciar salvamento (abre modal de senha para assinatura digital)
  const handleInitiateSaveAlvara = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocialInput.trim() || !cnpjCpfInput.trim() || !validadeInput) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Preencha Nome/Razão Social, CPF/CNPJ e Data de Validade.' });
      return;
    }
    setUserPasswordInput('');
    setPasswordError(null);
    setShowPasswordModal(true);
  };

  // Confirmar Senha e Assinar Digitalmente
  const handleConfirmPasswordAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const expectedPassword = currentUser?.senha;
    if (expectedPassword && userPasswordInput !== expectedPassword) {
      setPasswordError('Senha incorreta. Digite sua senha de usuário para assinar digitalmente.');
      return;
    } else if (!userPasswordInput || userPasswordInput.trim().length < 3) {
      setPasswordError('Digite sua senha para autenticar e gerar a assinatura digital.');
      return;
    }

    setIsSigning(true);
    try {
      const year = dataEmissaoInput.split('-')[0] || String(new Date().getFullYear());
      const token = `BC-VISA-${year}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const parts = numeroComplementoInput.split('/');
      const numeroFinal = (parts[0] || 'S/N').trim();
      const complementoFinal = (parts.slice(1).join('/') || '').trim();

      const now = new Date();
      const dataHoraAssinatura = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const nomeValidador = currentUser?.nome_completo || 'AUTORIDADE SANITÁRIA';
      const mensagemAssinaturaDigital = `Validado administrativamente por ${nomeValidador} em ${dataHoraAssinatura}, via classificação de risco sanitário.`;

      const alvaraData: AlvaraSanitarioItem = {
        id: editingId || `alv-${Date.now()}`,
        numero_alvara: numeroAlvaraInput || generateNewAlvaraNumber(),
        ano_exercicio: year,
        tipo_alvara: 'INICIAL',
        modelo_tipo: categoriaInput,
        pasta: pastaInput.trim().toUpperCase(),
        cnpj_cpf: cnpjCpfInput.trim(),
        razao_social: razaoSocialInput.trim().toUpperCase(),
        nome_fantasia: nomeFantasiaInput.trim().toUpperCase(),
        endereco: enderecoInput.trim().toUpperCase(),
        numero: numeroFinal.toUpperCase(),
        complemento: complementoFinal.toUpperCase(),
        bairro: bairroInput.trim().toUpperCase(),
        municipio: 'Balneário Camboriú',
        cep: cepInput.trim(),
        cnae_principal: cnaePrincipalInput.trim().toUpperCase(),
        validade: validadeInput,
        data_emissao: dataEmissaoInput,
        status: 'ATIVO',
        setor: selectedModelo.setorPadrao,
        condicionantes: condicionantesInput.trim(),
        fiscal_emissor: nomeValidador,
        matricula_fiscal: currentUser?.matricula || 'DVIS-BC',
        codigo_autenticacao: editingId ? alvaras.find((a) => a.id === editingId)?.codigo_autenticacao || token : token,
        assinatura_digital: mensagemAssinaturaDigital,
        assinado_por: nomeValidador,
        assinado_em: dataHoraAssinatura,
        modelo_doc_url: modeloDocUrlInput.trim() || googleDocsTemplateUrl,
        criado_em: editingId ? alvaras.find((a) => a.id === editingId)?.criado_em || new Date().toISOString() : new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };

      let updatedList: AlvaraSanitarioItem[];
      if (editingId) {
        updatedList = alvaras.map((a) => (a.id === editingId ? alvaraData : a));
        setFeedbackMsg({ tipo: 'sucesso', texto: `Alvará ${alvaraData.numero_alvara} atualizado e assinado digitalmente com sucesso!` });
      } else {
        updatedList = [alvaraData, ...alvaras];
        setFeedbackMsg({ tipo: 'sucesso', texto: `Alvará ${alvaraData.numero_alvara} assinado digitalmente e emitido com sucesso!` });
      }

      setAlvaras(updatedList);
      localStorage.setItem('visa_alvaras_cadastrados', JSON.stringify(updatedList));

      if (isSupabaseConfigured) {
        saveAlvaraToSupabase(alvaraData).catch(console.warn);
      }

      setShowPasswordModal(false);
      setUserPasswordInput('');
      handleOpenViewer(alvaraData, 'docs_embed');
      setActiveModule('consultar');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-4 text-left pb-16">
      {/* 1. TOPO COMPACTO (MAXIMIZA ÁREA DE TRABALHO) */}
      <AlvaraHeader onBack={onBack} googleDocsTemplateUrl={googleDocsTemplateUrl} />

      {/* 2. BARRA PRINCIPAL DE NAVEGAÇÃO EM BOTÕES (MODULARIZAÇÃO COMPLETA DO PROJETO) */}
      <AlvaraModuleNav
        activeModule={activeModule}
        onChangeModule={setActiveModule}
        totalAlvaras={alvaras.length}
        totalPastas={Object.keys(pastasAgrupadas).length}
      />

      {/* FEEDBACK MSG */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : feedbackMsg.tipo === 'erro'
              ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}
        >
          <span>{feedbackMsg.texto}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs uppercase hover:underline ml-4 font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* MÓDULO 1: CONSULTA & LISTAGEM */}
      {activeModule === 'consultar' && (
        <AlvaraConsultaModule
          alvaras={alvaras}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          modeloFilter={modeloFilter}
          setModeloFilter={setModeloFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          selectedPastaFilter={selectedPastaFilter}
          setSelectedPastaFilter={setSelectedPastaFilter}
          onOpenViewer={handleOpenViewer}
          onCopyDataForDocs={handleCopyDataForDocs}
          onEditAlvara={handleEditAlvara}
          onDeleteAlvara={handleDeleteAlvara}
          onSelectModeloParaCadastro={handleSelectModeloParaCadastro}
          onQuickSearchAndGeneratePdf={handleQuickSearchAndGeneratePdf}
        />
      )}

      {/* MÓDULO 2: CADASTRAR & EMITIR */}
      {activeModule === 'cadastrar' && (
        <AlvaraCadastroModule
          editingId={editingId}
          categoriaInput={categoriaInput}
          setCategoriaInput={setCategoriaInput}
          numeroAlvaraInput={numeroAlvaraInput}
          setNumeroAlvaraInput={setNumeroAlvaraInput}
          anoExercicioInput={anoExercicioInput}
          setAnoExercicioInput={setAnoExercicioInput}
          razaoSocialInput={razaoSocialInput}
          setRazaoSocialInput={setRazaoSocialInput}
          cnpjCpfInput={cnpjCpfInput}
          setCnpjCpfInput={setCnpjCpfInput}
          nomeFantasiaInput={nomeFantasiaInput}
          setNomeFantasiaInput={setNomeFantasiaInput}
          enderecoInput={enderecoInput}
          setEnderecoInput={setEnderecoInput}
          numeroComplementoInput={numeroComplementoInput}
          setNumeroComplementoInput={setNumeroComplementoInput}
          bairroInput={bairroInput}
          setBairroInput={setBairroInput}
          cepInput={cepInput}
          setCepInput={setCepInput}
          dataEmissaoInput={dataEmissaoInput}
          setDataEmissaoInput={setDataEmissaoInput}
          pastaInput={pastaInput}
          setPastaInput={setPastaInput}
          validadeInput={validadeInput}
          setValidadeInput={setValidadeInput}
          cnaePrincipalInput={cnaePrincipalInput}
          setCnaePrincipalInput={setCnaePrincipalInput}
          condicionantesInput={condicionantesInput}
          setCondicionantesInput={setCondicionantesInput}
          modeloDocUrlInput={modeloDocUrlInput}
          setModeloDocUrlInput={setModeloDocUrlInput}
          googleDocsTemplateUrl={googleDocsTemplateUrl}
          loadingCnpj={loadingCnpj}
          onSearchCnpj={handleConsultarCnpjCpf}
          onSubmit={handleInitiateSaveAlvara}
          onCancel={() => {
            setEditingId(null);
            setActiveModule('consultar');
          }}
          onSelectModeloParaCadastro={handleSelectModeloParaCadastro}
        />
      )}

      {/* MÓDULO 3: DOCUMENTO GOOGLE DOCS (OFICIAL & CONTROLE MASTER) */}
      {activeModule === 'docs' && (
        <AlvaraDocsModule
          googleDocsTemplateUrl={googleDocsTemplateUrl}
          setGoogleDocsTemplateUrl={setGoogleDocsTemplateUrl}
          onSaveGlobalDocsUrl={handleSaveGlobalDocsUrl}
          onApplyUrlToAllAlvaras={handleApplyUrlToAllAlvaras}
          alvaras={alvaras}
          isMaster={isMaster}
          setFeedbackMsg={setFeedbackMsg}
        />
      )}

      {/* MÓDULO 4: CONTROLE DE PASTAS FÍSICAS */}
      {activeModule === 'pastas' && (
        <AlvaraPastasModule
          alvaras={alvaras}
          pastasAgrupadas={pastasAgrupadas}
          onSelectPasta={(pasta) => {
            setSelectedPastaFilter(pasta);
            setActiveModule('consultar');
          }}
          onOpenViewer={handleOpenViewer}
        />
      )}

      {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO (GOOGLE DOCS EMBED + TIMBRADO) */}
      {selectedAlvaraForPrint && (
        <AlvaraPrintModal
          selectedAlvaraForPrint={selectedAlvaraForPrint}
          onClose={() => setSelectedAlvaraForPrint(null)}
          printViewMode={printViewMode}
          setPrintViewMode={setPrintViewMode}
          googleDocsTemplateUrl={googleDocsTemplateUrl}
          isMaster={isMaster}
          onUpdateAlvaraDocUrl={handleUpdateAlvaraDocUrl}
          onApplyUrlToAllAlvaras={handleApplyUrlToAllAlvaras}
        />
      )}

      {/* MODAL DE VALIDAÇÃO DE SENHA PARA ASSINATURA DIGITAL */}
      {showPasswordModal && (
        <AlvaraPasswordModal
          currentUser={currentUser}
          userPasswordInput={userPasswordInput}
          setUserPasswordInput={setUserPasswordInput}
          passwordError={passwordError}
          setPasswordError={setPasswordError}
          isSigning={isSigning}
          onConfirm={handleConfirmPasswordAndSave}
          onClose={() => {
            setShowPasswordModal(false);
            setUserPasswordInput('');
            setPasswordError(null);
          }}
        />
      )}
    </div>
  );
}
