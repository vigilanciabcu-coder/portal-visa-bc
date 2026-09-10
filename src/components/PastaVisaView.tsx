import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderArchive,
  Save,
  Search,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Copy,
  Check,
  Trash2,
  Edit3,
  RefreshCw,
  FileSpreadsheet,
  Plus,
  X,
  Info,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { PastaVisaItem, ProcessoItem, UserProfile } from '../types';
import { fetchCnpj } from '../lib/cnpjService';
import {
  fetchPastasVisaFromSupabase,
  savePastaVisaToSupabase,
  deletePastaVisaFromSupabase,
  isSupabaseConfigured
} from '../lib/supabaseService';
import {
  savePastaVisaToSheets,
  GOOGLE_APPS_SCRIPT_PASTA_VISA_TEMPLATE
} from '../lib/googleSheetsService';

interface PastaVisaViewProps {
  onBack: () => void;
  currentUser: UserProfile;
  processos?: ProcessoItem[];
}

export function PastaVisaView({ onBack, currentUser, processos = [] }: PastaVisaViewProps) {
  // Lista de Pastas
  const [pastas, setPastas] = useState<PastaVisaItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);

  // Formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cnpjCpf, setCnpjCpf] = useState<string>('');
  const [pasta, setPasta] = useState<string>('');
  const [razaoSocial, setRazaoSocial] = useState<string>('');
  const [statusRf, setStatusRf] = useState<string>('ATIVA');
  const [alvaraAtualizado, setAlvaraAtualizado] = useState<string>('SIM');
  const [setor, setSetor] = useState<string>('ALIMENTOS');
  const [observacoes, setObservacoes] = useState<string>('');

  // Busca e Status
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<{
    tipo: 'success' | 'info' | 'warning' | 'error';
    msg: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [sheetsFeedback, setSheetsFeedback] = useState<string | null>(null);

  // Filtros de busca na lista
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterSetor, setFilterSetor] = useState<string>('TODOS');

  // Modal Google Sheets
  const [showSheetsModal, setShowSheetsModal] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('visa_pasta_webhook_url') || '';
  });
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);

  // 1. Carregar pastas iniciais (Supabase com fallback localStorage)
  useEffect(() => {
    async function loadPastas() {
      setLoadingList(true);
      try {
        let loaded: PastaVisaItem[] | null = null;
        if (isSupabaseConfigured) {
          loaded = await fetchPastasVisaFromSupabase();
        }

        if (!loaded || loaded.length === 0) {
          const cached = localStorage.getItem('visa_pastas_administrativo');
          if (cached) {
            try {
              loaded = JSON.parse(cached);
            } catch (e) {
              console.warn('Erro ao ler cache local de pastas:', e);
            }
          }
        }

        if (loaded && loaded.length > 0) {
          setPastas(loaded);
        } else {
          // Itens de exemplo caso vazio para o servidor já visualizar a funcionalidade
          const mockIniciais: PastaVisaItem[] = [
            {
              id: 'pasta-demo-1',
              cnpj_cpf: '83.102.285/0001-07',
              pasta: '1042/2024',
              razao_social: 'MERCADO CENTRAL E DISTRIBUIDORA LTDA',
              status_rf: 'ATIVA',
              alvara_atualizado: 'SIM',
              setor: 'ALIMENTOS',
              observacoes: 'Pasta física localizada no Arquivo A, gaveta 3. Vistoria semestral em dia.',
              criado_por: 'ADMINISTRATIVO',
              criado_em: new Date().toISOString()
            },
            {
              id: 'pasta-demo-2',
              cnpj_cpf: '04.223.119/0001-55',
              pasta: '890/2023',
              razao_social: 'FARMÁCIA E DROGARIA ATLÂNTICA ME',
              status_rf: 'ATIVA',
              alvara_atualizado: 'EM RENOVAÇÃO',
              setor: 'MEDICAMENTOS',
              observacoes: 'Aguardando comprovante de TMI 2025 para anexar na pasta física.',
              criado_por: 'ADMINISTRATIVO',
              criado_em: new Date().toISOString()
            }
          ];
          setPastas(mockIniciais);
          localStorage.setItem('visa_pastas_administrativo', JSON.stringify(mockIniciais));
        }
      } finally {
        setLoadingList(false);
      }
    }

    loadPastas();
  }, []);

  // Salvar no cache local sempre que pastas mudar
  useEffect(() => {
    if (pastas.length > 0) {
      localStorage.setItem('visa_pastas_administrativo', JSON.stringify(pastas));
    }
  }, [pastas]);

  // Formatação de CPF/CNPJ
  const handleCnpjCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 14);

    let formatted = digits;
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      if (digits.length > 9) {
        formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
      } else if (digits.length > 6) {
        formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      } else if (digits.length > 3) {
        formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
      }
    } else {
      // CNPJ: 00.000.000/0000-00
      if (digits.length > 12) {
        formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
      } else if (digits.length > 8) {
        formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      } else if (digits.length > 5) {
        formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
      } else if (digits.length > 2) {
        formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
      }
    }

    setCnpjCpf(formatted);
    setSearchFeedback(null);
  };

  // BUSCA AUTOMÁTICA INTELIGENTE AO DIGITAR CPF (11 DÍGITOS) OU CNPJ (14 DÍGITOS)
  useEffect(() => {
    const digits = cnpjCpf.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      return;
    }

    // Debounce de 400ms para evitar chamadas enquanto digita o último caractere
    const timer = setTimeout(() => {
      executarBuscaAutomatica(digits);
    }, 400);

    return () => clearTimeout(timer);
  }, [cnpjCpf]);

  async function executarBuscaAutomatica(digits: string) {
    if (digits.length !== 11 && digits.length !== 14) return;
    setIsSearching(true);
    setSearchFeedback({ tipo: 'info', msg: '🔍 Buscando dados no banco e na Receita...' });

    try {
      // 1. Verificar se já existe cadastrado no arquivo de Pastas VISA
      const pastaExistente = pastas.find((p) => p.cnpj_cpf.replace(/\D/g, '') === digits);
      if (pastaExistente) {
        setPasta(pastaExistente.pasta || pasta);
        setRazaoSocial(pastaExistente.razao_social || razaoSocial);
        setStatusRf(pastaExistente.status_rf || statusRf);
        setAlvaraAtualizado(pastaExistente.alvara_atualizado || alvaraAtualizado);
        setSetor(pastaExistente.setor || setor);
        if (pastaExistente.observacoes && !observacoes) {
          setObservacoes(pastaExistente.observacoes);
        }
        setSearchFeedback({
          tipo: 'success',
          msg: `✓ Encontrado no Arquivo VISA (Pasta: ${pastaExistente.pasta || 'S/N'})! Dados preenchidos automaticamente.`
        });
        setIsSearching(false);
        return;
      }

      // 2. Verificar se já existe na Carteira de Processos Sanitários
      const processoExistente = processos.find((proc) => {
        const pDigits = (proc.cnpj_cpf || '').replace(/\D/g, '');
        return pDigits === digits;
      });

      if (processoExistente) {
        if (processoExistente.pasta) setPasta(processoExistente.pasta);
        if (processoExistente.razao_social || processoExistente.nome_fantasia) {
          setRazaoSocial(processoExistente.razao_social || processoExistente.nome_fantasia || '');
        }
        if (processoExistente.setor) {
          setSetor(processoExistente.setor.toUpperCase());
        }
        if (processoExistente.validade) {
          setAlvaraAtualizado('SIM');
        }

        setSearchFeedback({
          tipo: 'success',
          msg: `✓ Encontrado na Carteira de Processos Sanitários! Dados preenchidos.`
        });
        setIsSearching(false);
        return;
      }

      // 3. Se for CNPJ (14 dígitos), consulta dados oficiais da Receita Federal (BrasilAPI / MinhaReceita)
      if (digits.length === 14) {
        const dadosRf = await fetchCnpj(digits);
        if (dadosRf && dadosRf.razao) {
          setRazaoSocial(dadosRf.razao.toUpperCase());
          if (dadosRf.situacao_cadastral || dadosRf.situacao) {
            setStatusRf((dadosRf.situacao_cadastral || dadosRf.situacao || 'ATIVA').toUpperCase());
          }

          // Identificar setor provável pelo CNAE ou atividade
          const cnaeTexto = (dadosRf.cnae || dadosRf.tipo_atividade || '').toUpperCase();
          if (cnaeTexto.includes('ALIMENTO') || cnaeTexto.includes('RESTAURANTE') || cnaeTexto.includes('MERCADO') || cnaeTexto.includes('LANCHE') || cnaeTexto.includes('PADARIA')) {
            setSetor('ALIMENTOS');
          } else if (cnaeTexto.includes('DROGARIA') || cnaeTexto.includes('FARM') || cnaeTexto.includes('MEDIC')) {
            setSetor('MEDICAMENTOS');
          } else if (cnaeTexto.includes('CLINICA') || cnaeTexto.includes('MEDIC') || cnaeTexto.includes('ODONT') || cnaeTexto.includes('HOSP')) {
            setSetor('SAÚDE');
          } else if (cnaeTexto.includes('SALAO') || cnaeTexto.includes('ESTETICA') || cnaeTexto.includes('BELEZA')) {
            setSetor('SERVIÇOS');
          }

          setSearchFeedback({
            tipo: 'success',
            msg: `✓ Dados oficiais da Receita Federal carregados com sucesso!`
          });
          setIsSearching(false);
          return;
        }
      }

      // Se não encontrou dados automáticos
      setSearchFeedback({
        tipo: 'warning',
        msg: 'Documento não encontrado no banco anterior. Prossiga preenchendo os campos normalmente.'
      });
    } catch (err) {
      console.warn('Erro na busca de CPF/CNPJ:', err);
      setSearchFeedback({
        tipo: 'warning',
        msg: 'Não foi possível consultar automaticamente. Preencha manualmente.'
      });
    } finally {
      setIsSearching(false);
    }
  }

  // Limpar formulário
  const limparFormulario = () => {
    setEditingId(null);
    setCnpjCpf('');
    setPasta('');
    setRazaoSocial('');
    setStatusRf('ATIVA');
    setAlvaraAtualizado('SIM');
    setSetor('ALIMENTOS');
    setObservacoes('');
    setSearchFeedback(null);
    setSaveSuccessMsg(null);
    setSheetsFeedback(null);
  };

  // Carregar para edição
  const handleEditar = (item: PastaVisaItem) => {
    setEditingId(item.id);
    setCnpjCpf(item.cnpj_cpf);
    setPasta(item.pasta);
    setRazaoSocial(item.razao_social);
    setStatusRf(item.status_rf || 'ATIVA');
    setAlvaraAtualizado(item.alvara_atualizado || 'SIM');
    setSetor(item.setor || 'ALIMENTOS');
    setObservacoes(item.observacoes || '');
    setSearchFeedback({
      tipo: 'info',
      msg: `Modo de edição: alterando os dados da Pasta ${item.pasta || item.cnpj_cpf}.`
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Excluir item
  const handleExcluir = async (id: string) => {
    const item = pastas.find((p) => p.id === id);
    const confirma = window.confirm(`Deseja realmente remover o registro da pasta "${item?.pasta || item?.razao_social}"?`);
    if (!confirma) return;

    // Remove do estado local
    const novaLista = pastas.filter((p) => p.id !== id);
    setPastas(novaLista);
    localStorage.setItem('visa_pastas_administrativo', JSON.stringify(novaLista));

    // Remove do Supabase
    if (isSupabaseConfigured) {
      await deletePastaVisaFromSupabase(id);
    }

    if (editingId === id) {
      limparFormulario();
    }
  };

  // Salvar registro (Local + Supabase + Google Sheets)
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cnpjCpf.trim() && !pasta.trim() && !razaoSocial.trim()) {
      alert('Por favor, informe ao menos o CPF/CNPJ, o Número da Pasta ou a Razão Social.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSheetsFeedback(null);

    const nowIso = new Date().toISOString();
    const itemId = editingId || `pasta-${Date.now()}`;

    const novaPasta: PastaVisaItem = {
      id: itemId,
      cnpj_cpf: cnpjCpf.trim(),
      pasta: pasta.trim(),
      razao_social: razaoSocial.trim().toUpperCase(),
      status_rf: statusRf.trim().toUpperCase(),
      alvara_atualizado: alvaraAtualizado.trim().toUpperCase(),
      setor: setor.trim().toUpperCase(),
      observacoes: observacoes.trim(),
      criado_por: currentUser?.nome_completo || currentUser?.cargo || 'ADMINISTRATIVO',
      criado_em: editingId ? (pastas.find((p) => p.id === editingId)?.criado_em || nowIso) : nowIso,
      atualizado_em: nowIso
    };

    try {
      // 1. Atualizar Estado Local
      let listaAtualizada: PastaVisaItem[];
      if (editingId) {
        listaAtualizada = pastas.map((p) => (p.id === editingId ? novaPasta : p));
      } else {
        listaAtualizada = [novaPasta, ...pastas];
      }
      setPastas(listaAtualizada);
      localStorage.setItem('visa_pastas_administrativo', JSON.stringify(listaAtualizada));

      // 2. Salvar no Supabase
      if (isSupabaseConfigured) {
        await savePastaVisaToSupabase(novaPasta);
      }

      // 3. Salvar simultaneamente no Google Sheets (se webhook configurado)
      const sheetsResult = await savePastaVisaToSheets(novaPasta, webhookUrl);
      if (sheetsResult.isSavedToSheets) {
        setSheetsFeedback('✓ Sincronizado também com a Planilha do Google Sheets!');
      } else if (webhookUrl) {
        setSheetsFeedback('Sincronização com Google Sheets enviada em segundo plano.');
      }

      setSaveSuccessMsg(`Pasta "${novaPasta.pasta || novaPasta.razao_social}" salva com sucesso!`);
      limparFormulario();
    } catch (err: any) {
      console.error('Erro ao salvar pasta visa:', err);
      alert('Ocorreu um erro ao salvar o registro. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar configuração do Google Sheets Webhook URL
  const salvarConfigSheets = () => {
    localStorage.setItem('visa_pasta_webhook_url', webhookUrl.trim());
    alert('URL do Webhook do Google Sheets salva com sucesso no navegador!');
  };

  // Testar conexão com Webhook do Google Sheets
  const testarWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('Por favor, informe a URL do Webhook do Google Apps Script antes de testar.');
      return;
    }
    setTestWebhookStatus('Testando comunicação...');
    try {
      const itemTeste: PastaVisaItem = {
        id: 'teste-' + Date.now(),
        cnpj_cpf: '00.000.000/0001-91',
        pasta: 'TESTE-ONLINE',
        razao_social: 'TESTE DE SINCRONIZAÇÃO VISA BC',
        status_rf: 'ATIVA',
        alvara_atualizado: 'SIM',
        setor: 'ADMINISTRATIVO',
        observacoes: 'Linha de verificação enviada pelo Portal VISA.',
        criado_por: currentUser.nome_completo || 'ADMINISTRATIVO'
      };
      await savePastaVisaToSheets(itemTeste, webhookUrl.trim());
      setTestWebhookStatus('✓ Sinal de teste enviado com sucesso! Verifique a nova linha na sua Planilha Google.');
    } catch (err: any) {
      setTestWebhookStatus(`Falha ao testar: ${err?.message || 'Erro de conexão'}`);
    }
  };

  // Copiar código do Google Apps Script
  const copiarScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_PASTA_VISA_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Exportar para CSV / Planilha Excel
  const exportarCsv = () => {
    if (pastas.length === 0) {
      alert('Nenhuma pasta cadastrada para exportar.');
      return;
    }

    const headers = [
      'ID',
      'CPF/CNPJ',
      'PASTA',
      'RAZAO_SOCIAL',
      'STATUS_RF',
      'ALVARA_ATUALIZADO_TMI',
      'SETOR',
      'OBSERVACOES',
      'CRIADO_POR',
      'CRIADO_EM'
    ];

    const rows = pastas.map((p) => [
      p.id,
      `"${p.cnpj_cpf}"`,
      `"${p.pasta}"`,
      `"${(p.razao_social || '').replace(/"/g, '""')}"`,
      `"${p.status_rf}"`,
      `"${p.alvara_atualizado}"`,
      `"${p.setor}"`,
      `"${(p.observacoes || '').replace(/"/g, '""')}"`,
      `"${p.criado_por || ''}"`,
      `"${p.criado_em || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PASTAS_VISA_BC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem na tabela
  const pastasFiltradas = useMemo(() => {
    return pastas.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.cnpj_cpf.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pasta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.observacoes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        filterStatus === 'TODOS' ||
        (p.status_rf || '').toUpperCase() === filterStatus.toUpperCase();

      const matchSetor =
        filterSetor === 'TODOS' ||
        (filterSetor === 'SANEAMENTO'
          ? (p.setor || '').toUpperCase().includes('SANE') || (p.setor || '').toUpperCase().includes('SANI')
          : (p.setor || '').toUpperCase() === filterSetor.toUpperCase());

      return matchSearch && matchStatus && matchSetor;
    });
  }, [pastas, searchTerm, filterStatus, filterSetor]);

  // Contadores
  const totalPastas = pastas.length;
  const ativasRf = pastas.filter((p) => (p.status_rf || '').toUpperCase() === 'ATIVA').length;
  const alvaraOk = pastas.filter((p) => (p.alvara_atualizado || '').toUpperCase() === 'SIM').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-6 lg:p-8">
      {/* CABEÇALHO */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              id="btn-voltar-pasta-visa"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Voltar para a página inicial"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  PASTA VISA
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                  ADMINISTRATIVO
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cadastro e controle de pastas físicas, CPF/CNPJ, alvarás e situação cadastral
              </p>
            </div>
          </div>

          {/* Botões de Ação do Topo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSheetsModal(true)}
              id="btn-config-sheets"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Google Sheets</span>
              {webhookUrl ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Sincronização ativa"></span>
              ) : null}
            </button>

            <button
              onClick={exportarCsv}
              id="btn-exportar-csv"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Baixar planilha compatível com Excel e Google Sheets"
            >
              <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO RÁPIDO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total de Pastas
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalPastas}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FolderArchive className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Situação RF Ativa
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{ativasRf}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Alvará / TMI Atualizado
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{alvaraOk}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* FORMULÁRIO DE CADASTRO E EDIÇÃO (COLUNA ESQUERDA) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-6">
            {/* Header do Form */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    {editingId ? 'Editar Pasta VISA' : 'Cadastrar Nova Pasta VISA'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preencha os campos abaixo para arquivar
                  </p>
                </div>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            {/* Notificação de Sucesso */}
            {saveSuccessMsg && (
              <div className="m-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <p className="font-semibold">{saveSuccessMsg}</p>
                  {sheetsFeedback && <p className="mt-0.5 opacity-90">{sheetsFeedback}</p>}
                </div>
                <button
                  onClick={() => setSaveSuccessMsg(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:opacity-75"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* FORM BODY */}
            <form onSubmit={handleSalvar} className="p-4 sm:p-5 space-y-4">
              {/* 1. CPF / CNPJ COM BUSCA AUTOMÁTICA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="input-cnpj-cpf" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    CPF / CNPJ <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Busca automática ao digitar
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="input-cnpj-cpf"
                    type="text"
                    value={cnpjCpf}
                    onChange={handleCnpjCpfChange}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono"
                    required
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin mr-1" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => executarBuscaAutomatica(cnpjCpf.replace(/\D/g, ''))}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Executar busca cadastral"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback da Busca Automática */}
                {searchFeedback && (
                  <div
                    className={`mt-1.5 p-2 rounded-lg text-xs flex items-center gap-2 ${
                      searchFeedback.tipo === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : searchFeedback.tipo === 'info'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{searchFeedback.msg}</span>
                  </div>
                )}
              </div>

              {/* 2. PASTA */}
              <div>
                <label htmlFor="input-pasta" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  PASTA <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-pasta"
                  type="text"
                  value={pasta}
                  onChange={(e) => setPasta(e.target.value)}
                  placeholder="Ex: 1042/2024 ou P-582"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-semibold"
                  required
                />
              </div>

              {/* 3. RAZÃO SOCIAL */}
              <div>
                <label htmlFor="input-razao-social" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  RAZÃO SOCIAL <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-razao-social"
                  type="text"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Nome empresarial ou pessoa física"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all uppercase"
                  required
                />
              </div>

              {/* 4. STATUS / RF & 5. ALVARÁ ATUALIZADO / TMI (2 COLUNAS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* STATUS / RF */}
                <div>
                  <label htmlFor="select-status-rf" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    STATUS / RF
                  </label>
                  <select
                    id="select-status-rf"
                    value={statusRf}
                    onChange={(e) => setStatusRf(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    <option value="ATIVA">ATIVA</option>
                    <option value="BAIXADA">BAIXADA</option>
                    <option value="SUSPENSA">SUSPENSA</option>
                    <option value="INAPTA">INAPTA</option>
                    <option value="NULA">NULA</option>
                    <option value="NÃO INFORMADO">NÃO INFORMADO</option>
                  </select>
                </div>

                {/* ALVARÁ ATUALIZADO / TMI */}
                <div>
                  <label htmlFor="select-alvara-atualizado" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    ALVARÁ / TMI
                  </label>
                  <select
                    id="select-alvara-atualizado"
                    value={alvaraAtualizado}
                    onChange={(e) => setAlvaraAtualizado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    <option value="SIM">SIM (EM DIA)</option>
                    <option value="NÃO">NÃO (PENDENTE)</option>
                    <option value="EM RENOVAÇÃO">EM RENOVAÇÃO</option>
                    <option value="TMI PAGO">TMI PAGO</option>
                    <option value="ISENTO">ISENTO</option>
                    <option value="VISTORIA AGENDADA">VISTORIA AGENDADA</option>
                  </select>
                </div>
              </div>

              {/* 6. SETOR */}
              <div>
                <label htmlFor="input-setor" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  SETOR
                </label>
                <div className="space-y-1.5">
                  <input
                    id="input-setor"
                    type="text"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    placeholder="Ex: ALIMENTOS, SAÚDE, SERVIÇOS..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 uppercase"
                  />
                  {/* Atalhos rápidos de setor */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {['ALIMENTOS', 'SAÚDE', 'SANEAMENTO'].map((s) => {
                      const isSelected =
                        setor.toUpperCase() === s ||
                        (s === 'SANEAMENTO' && (setor.toUpperCase() === 'SANIAMENTO' || setor.toUpperCase().includes('SANE')));
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSetor(s)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 7. OBSERVAÇÕES */}
              <div>
                <label htmlFor="input-observacoes" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  OBSERVAÇÕES
                </label>
                <textarea
                  id="input-observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Localização da pasta no arquivo físico, pendências, notas administrativas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none"
                />
              </div>

              {/* BOTÕES DE SALVAR E LIMPAR */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  id="btn-salvar-pasta-visa"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando registro...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingId ? 'Atualizar Pasta' : 'Salvar Pasta VISA'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                  Limpar
                </button>
              </div>

              {/* Dica da Planilha Google */}
              {webhookUrl ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sincronização com Google Sheets ativa para cada salvamento.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>Dica: clique em &quot;Google Sheets&quot; no topo para salvar automaticamente em sua planilha.</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LISTAGEM DE PASTAS CADASTRADAS (COLUNA DIREITA) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* BARRA DE FILTROS E BUSCA */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Campo de Busca Livre */}
              <div className="relative flex-1 min-w-0 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por Pasta, Razão Social, CPF/CNPJ..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtro Status RF (tamanho compacto de metade do tamanho) */}
              <select
                id="filtro_status_rf"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                title="Filtrar por Status RF"
                className="w-full sm:w-16 sm:min-w-[64px] sm:max-w-[72px] px-1.5 py-2 text-[11px] font-medium truncate rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer text-center"
              >
                <option value="TODOS">RF</option>
                <option value="ATIVA">Ativa</option>
                <option value="BAIXADA">Baixada</option>
                <option value="SUSPENSA">Suspensa</option>
                <option value="INAPTA">Inapta</option>
              </select>

              {/* Filtro Setor (tamanho compacto de metade do tamanho) */}
              <select
                id="filtro_setor"
                value={filterSetor}
                onChange={(e) => setFilterSetor(e.target.value)}
                title="Filtrar por Setor"
                className="w-full sm:w-20 sm:min-w-[72px] sm:max-w-[80px] px-1.5 py-2 text-[11px] font-medium truncate rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer text-center"
              >
                <option value="TODOS">Setor</option>
                <option value="ALIMENTOS">Alimentos</option>
                <option value="SAÚDE">Saúde</option>
                <option value="SANEAMENTO">Saneamento</option>
                <option value="MEDICAMENTOS">Medicamentos</option>
                <option value="SERVIÇOS">Serviços</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>
                Exibindo <strong className="text-slate-900 dark:text-white">{pastasFiltradas.length}</strong> de {pastas.length} registros
              </span>
              {(searchTerm || filterStatus !== 'TODOS' || filterSetor !== 'TODOS') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('TODOS');
                    setFilterSetor('TODOS');
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* TABELA / CARDS DE PASTAS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingList ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
                <p className="text-sm">Carregando arquivo de pastas...</p>
              </div>
            ) : pastasFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <FolderArchive className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma pasta encontrada
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cadastre uma nova pasta pelo formulário ao lado para começar
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pastasFiltradas.map((item) => {
                  const isAtiva = (item.status_rf || '').toUpperCase() === 'ATIVA';
                  const isAlvaraOk = (item.alvara_atualizado || '').toUpperCase() === 'SIM';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                        editingId === item.id ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-500' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        {/* Identificação e Dados */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Número da Pasta em destaque */}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold text-xs border border-amber-200 dark:border-amber-800">
                              <FolderArchive className="w-3.5 h-3.5" />
                              PASTA: {item.pasta || 'S/N'}
                            </span>

                            {/* CPF/CNPJ */}
                            <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {item.cnpj_cpf}
                            </span>

                            {/* Setor */}
                            {item.setor && (
                              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
                                {item.setor}
                              </span>
                            )}
                          </div>

                          {/* Razão Social */}
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate">
                            {item.razao_social || 'NÃO INFORMADO'}
                          </h3>

                          {/* Badges de Status RF e Alvará */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {/* Status RF */}
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                isAtiva
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              RF: {item.status_rf || 'ATIVA'}
                            </span>

                            {/* Alvará / TMI */}
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                isAlvaraOk
                                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              ALVARÁ/TMI: {item.alvara_atualizado || 'SIM'}
                            </span>

                            {item.criado_por && (
                              <span className="text-[11px] text-slate-400">
                                Por: {item.criado_por}
                              </span>
                            )}
                          </div>

                          {/* Observações */}
                          {item.observacoes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 mt-1">
                              <strong>Obs:</strong> {item.observacoes}
                            </p>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1.5 self-end sm:self-start flex-shrink-0">
                          <button
                            onClick={() => handleEditar(item)}
                            id={`btn-editar-pasta-${item.id}`}
                            className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 dark:hover:text-amber-400 transition-colors"
                            title="Editar pasta"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleExcluir(item.id)}
                            id={`btn-excluir-pasta-${item.id}`}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors"
                            title="Remover registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL / DIALOG: CONFIGURAÇÃO GOOGLE SHEETS & APPS SCRIPT */}
      {/* ========================================================= */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Integração com Planilha Google Sheets
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Como salvar os dados da PASTA VISA automaticamente na sua planilha do Google
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body com Scroll */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300">
              {/* 1. URL do Webhook */}
              <div className="space-y-2 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                  URL do Webhook do Google Apps Script (Exec)
                </label>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Cole aqui o link gerado após implantar o script na sua planilha:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={salvarConfigSheets}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors whitespace-nowrap"
                    >
                      Salvar URL
                    </button>
                    <button
                      type="button"
                      onClick={testarWebhook}
                      className="px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Testar Conexão
                    </button>
                  </div>
                </div>

                {testWebhookStatus && (
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 pt-1">
                    {testWebhookStatus}
                  </p>
                )}
              </div>

              {/* 2. Passo a Passo Didático */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Passo a Passo de Configuração na Planilha Google
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 pl-1 leading-relaxed">
                  <li>
                    Crie ou abra uma planilha no seu Google Drive (ex: com o nome <strong>&quot;PASTAS VISA BC&quot;</strong>).
                  </li>
                  <li>
                    No menu superior da planilha, clique em <strong>Extensões</strong> &gt; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Apague qualquer código existente no editor e <strong>cole o script pronto abaixo</strong>.
                  </li>
                  <li>
                    Clique em <strong>Salvar</strong> (ícone de disquete) e depois no botão azul <strong>Implantar</strong> &gt; <strong>Nova implantação</strong>.
                  </li>
                  <li>
                    Na engrenagem ao lado de &quot;Selecione o tipo&quot;, escolha <strong>App da Web</strong>.
                  </li>
                  <li>
                    Configure:
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-slate-500 dark:text-slate-400">
                      <li><strong>Executar como:</strong> Eu (seu e-mail)</li>
                      <li><strong>Quem pode acessar:</strong> <u>Qualquer pessoa</u> (necessário para o portal enviar os dados)</li>
                    </ul>
                  </li>
                  <li>
                    Clique em <strong>Implantar</strong>, autorize as permissões e <strong>copie o URL do App da Web</strong> gerado (termina com <code>/exec</code>).
                  </li>
                  <li>
                    Cole o link no campo acima e clique em <strong>Salvar URL</strong>. Pronto! Cada cadastro será gravado na sua planilha automaticamente em tempo real!
                  </li>
                </ol>
              </div>

              {/* 3. Código do Google Apps Script Pronto para Copiar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                    Código do Google Apps Script (Copiar e Colar)
                  </h4>
                  <button
                    type="button"
                    onClick={copiarScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-2xl text-xs font-mono max-h-56 overflow-y-auto overflow-x-auto border border-slate-800 select-all">
                    {GOOGLE_APPS_SCRIPT_PASTA_VISA_TEMPLATE}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowSheetsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
