import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Camera,
  Upload,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Send,
  HelpCircle,
  FileCheck,
  Droplet,
  Flame,
  BadgeCheck,
  Search,
  Check
} from 'lucide-react';
import { BAIRROS_BC } from '../data/mockData';
import { ProcessoItem, TramitacaoItem, UserProfile } from '../types';
import { gerarProximoProtocolo } from '../lib/protocoloService';

export interface ServicoIdeiaItem {
  id: string;
  titulo: string;
  categoria: 'LICENCIAMENTO' | 'HABITE_SE' | 'AGUA' | 'EVENTOS' | 'VIABILIDADE' | 'DENUNCIA' | 'BAIXA';
  icone: string;
  resumo: string;
  prazoMedio: string;
  grauRiscoSugerido: 'BAIXO RISCO' | 'MÉDIO RISCO' | 'ALTO RISCO';
  inovacaoIdeia: string;
  documentosNecessarios: string[];
  beneficioCidadao: string;
}

export const SERVICOS_IDEIAS_VISA: ServicoIdeiaItem[] = [
  {
    id: 'alvara_inicial',
    titulo: 'Alvará Sanitário Inicial (Licenciamento)',
    categoria: 'LICENCIAMENTO',
    icone: '🏪',
    resumo: 'Abertura para novos estabelecimentos de alimentação, saúde, farmácias, estéticas e comércio em geral.',
    prazoMedio: '3 a 5 dias úteis',
    grauRiscoSugerido: 'MÉDIO RISCO',
    inovacaoIdeia: 'Liberação acelerada com Autodeclaração de Conformidade para atividades de Baixo Risco (dispensa vistoria prévia).',
    documentosNecessarios: [
      'CNPJ e Contrato Social atualizado',
      'Comprovante de Endereço em Balneário Camboriú',
      'Atestado de Vistoria do Corpo de Bombeiros (AVCB)',
      'Certificado de Limpeza de Caixa d’Água e Dedetização'
    ],
    beneficioCidadao: 'Alvará digital com QR Code para exposição imediata na vitrine ou balcão.'
  },
  {
    id: 'renovacao_alvara',
    titulo: 'Renovação Anual de Alvará Sanitário',
    categoria: 'LICENCIAMENTO',
    icone: '🔄',
    resumo: 'Revalidação periódica anual de estabelecimentos comerciais, consultórios e indústrias.',
    prazoMedio: '24 a 48 horas',
    grauRiscoSugerido: 'BAIXO RISCO',
    inovacaoIdeia: 'Renovação simplificada sem burocracia se o estabelecimento manteve boas práticas no ano anterior.',
    documentosNecessarios: [
      'Comprovante de pagamento da taxa de renovação',
      'Comprovante atualizado de controle de pragas (desratização/desinsetização)',
      'Certidão de regularidade do Responsável Técnico (quando aplicável)'
    ],
    beneficioCidadao: 'Sem necessidade de nova vistoria física caso não haja alteração estrutural ou denúncia.'
  },
  {
    id: 'habite_se_sanitario',
    titulo: 'Habite-se Sanitário (Edificações & Obras)',
    categoria: 'HABITE_SE',
    icone: '🏗️',
    resumo: 'Vistoria e certidão hidrossanitária obrigatória para habite-se de obras residenciais e comerciais.',
    prazoMedio: '5 dias úteis',
    grauRiscoSugerido: 'ALTO RISCO',
    inovacaoIdeia: 'Agendamento prévio com confirmação da viatura e checklist fotográfico de caixas de esgoto e gordura.',
    documentosNecessarios: [
      'Projeto Hidrossanitário aprovado pela EMASA',
      'ART/RRT de execução da obra',
      'Fotos comprovando instalação das caixas de gordura e inspeção'
    ],
    beneficioCidadao: 'Conexão direta com a Secretaria de Planejamento Urbano e certidão com numeração oficial.'
  },
  {
    id: 'analise_agua',
    titulo: 'Análise & Laudo de Água Potável (Laboratório)',
    categoria: 'AGUA',
    icone: '🔬',
    resumo: 'Coleta técnica e ensaios bacteriológicos e físico-químicos pelo Laboratório Municipal da VISA.',
    prazoMedio: '48 horas após coleta',
    grauRiscoSugerido: 'ALTO RISCO',
    inovacaoIdeia: 'Alerta instantâneo ao munícipe caso ocorra presença de coliformes ou desvio de cloro com orientações de desinfecção.',
    documentosNecessarios: [
      'Formulário com ponto exato de captação (torneira direta, poço ou reservatório)',
      'Comprovante da taxa municipal de análise laboratorial',
      'Telefone para agendamento da equipe de coleta in loco'
    ],
    beneficioCidadao: 'Laudo assinado digitalmente com validade perante todos os órgãos sanitários e condomínios.'
  },
  {
    id: 'evento_temporario',
    titulo: 'Alvará Temporário para Eventos & Feiras',
    categoria: 'EVENTOS',
    icone: '🎪',
    resumo: 'Licença sanitária para food trucks, feirantes, festas gastronômicas e eventos temporários.',
    prazoMedio: '48 horas',
    grauRiscoSugerido: 'MÉDIO RISCO',
    inovacaoIdeia: 'Emissão rápida via celular para feirantes cadastrados com credencial digital provisória.',
    documentosNecessarios: [
      'Autorização prévia do local / Secretaria de Turismo ou Fundação de Cultura',
      'Lista dos alimentos e bebidas comercializados',
      'Certificado de curso de Manipulação de Alimentos'
    ],
    beneficioCidadao: 'Autorização ágil sem perder a data do evento ou da temporada de verão.'
  },
  {
    id: 'consulta_cnae',
    titulo: 'Consulta Prévia de Viabilidade Sanitária (CNAE)',
    categoria: 'VIABILIDADE',
    icone: '🧭',
    resumo: 'Orientação preventiva antes de alugar ou reformar um imóvel para saber as exigências sanitárias.',
    prazoMedio: 'Imediato (Online)',
    grauRiscoSugerido: 'BAIXO RISCO',
    inovacaoIdeia: 'Simulador inteligente que cruza o CNAE com o Código Sanitário de Balneário Camboriú.',
    documentosNecessarios: [
      'Código do CNAE da atividade planejada',
      'Endereço provável ou bairro de instalação',
      'Metragem aproximada do imóvel'
    ],
    beneficioCidadao: 'Evita gastos com reformas inadequadas ou locação de imóveis que não cumprem o código de saúde.'
  },
  {
    id: 'denuncia_sanitaria',
    titulo: 'Registro de Denúncia Sanitária com Fotos & GPS',
    categoria: 'DENUNCIA',
    icone: '🚨',
    resumo: 'Relato de irregularidades com opção de anonimato, fotos de evidência e ponto no mapa.',
    prazoMedio: 'Triagem em 24h',
    grauRiscoSugerido: 'ALTO RISCO',
    inovacaoIdeia: 'Geração imediata de ordem de vistoria para a viatura mais próxima via GEO VISA.',
    documentosNecessarios: [
      'Fotos ou vídeos da irregularidade',
      'Endereço do estabelecimento com ponto de referência',
      'Relato detalhado dos fatos'
    ],
    beneficioCidadao: 'Fiscalização célere com proteção total ao sigilo do denunciante.'
  },
  {
    id: 'baixa_sanitaria',
    titulo: 'Certidão de Baixa / Desativação Sanitária',
    categoria: 'BAIXA',
    icone: '📑',
    resumo: 'Encerramento formal de atividades e desincorporação de responsabilidade técnica.',
    prazoMedio: '3 dias úteis',
    grauRiscoSugerido: 'BAIXO RISCO',
    inovacaoIdeia: 'Baixa integrada com o sistema tributário municipal sem gerar cobrança de taxa futura.',
    documentosNecessarios: [
      'Distrato Social ou Certidão de Baixa na Receita Federal',
      'Último alvará sanitário emitido (se houver)',
      'Declaração de destinação de resíduos perigosos ou medicamentos (se aplicável)'
    ],
    beneficioCidadao: 'Cessa imediatamente qualquer responsabilidade fiscal ou sanitária do proprietário.'
  }
];

export const ESTABELECIMENTOS_TESTE_LINKADOS = [
  {
    nome: 'Restaurante Mar Azul Gourmet',
    razao_social: 'RESTAURANTE MAR AZUL GOURMET LTDA',
    nome_fantasia: 'RESTAURANTE MAR AZUL',
    cnpj_cpf: '14.238.910/0001-55',
    endereco: 'AVENIDA ATLÂNTICA',
    numeroComplemento: '2500',
    bairro: 'Centro',
    telefone: '(47) 3367-8899',
    email: 'contato@marazulgourmet.com.br',
    protocoloVinculado: '067020/2026',
    destaque: '💧 Laudo de Água Potável (8 pontos) + Vistorias Concluídas'
  },
  {
    nome: 'Restaurante O Quintal BC',
    razao_social: 'RESTAURANTE O QUINTAL BC LTDA',
    nome_fantasia: 'O QUINTAL BC',
    cnpj_cpf: '60.541.108/0001-13',
    endereco: 'RUA 2700',
    numeroComplemento: '708',
    bairro: 'Centro',
    telefone: '(47) 3360-1200',
    email: 'financeiro@oquintalbc.com.br',
    protocoloVinculado: '000101/2026',
    destaque: '🍽️ Alvará Inicial + Alto Risco + Vistoria Técnica'
  },
  {
    nome: 'Nossa Padaria BC',
    razao_social: 'NOSSA PADARIA LTDA',
    nome_fantasia: 'NOSSA PADARIA',
    cnpj_cpf: '63.691.709/0001-09',
    endereco: 'AVENIDA PALESTINA',
    numeroComplemento: '870',
    bairro: 'Nações',
    telefone: '(47) 3363-4455',
    email: 'atendimento@nossapadaria.com.br',
    protocoloVinculado: '000142/2026',
    destaque: '🍞 Renovação Deferida + Boas Práticas Sanitárias'
  },
  {
    nome: 'Drogaria e Farmácia Central',
    razao_social: 'DROGARIA E FARMÁCIA CENTRAL SC',
    nome_fantasia: 'FARMÁCIA CENTRAL',
    cnpj_cpf: '98.765.432/0001-10',
    endereco: 'RUA 1500',
    numeroComplemento: '420, SALA 01',
    bairro: 'Pioneiros',
    telefone: '(47) 3361-9000',
    email: 'farmaceutico@farmaciacentralbc.com.br',
    protocoloVinculado: '000205/2026',
    destaque: '💊 Licença de Medicamentos + Setor Saúde'
  }
];

export interface SolicitacaoMunicipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSaveProcesso: (novoProcesso: ProcessoItem) => void;
  servicoPreSelecionadoId?: string;
  onAbrirAcompanhamento?: () => void;
  processosExistentes?: ProcessoItem[];
}

export const SolicitacaoMunicipeModal: React.FC<SolicitacaoMunicipeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProcesso,
  servicoPreSelecionadoId,
  onAbrirAcompanhamento,
  processosExistentes = []
}) => {
  const [etapa, setEtapa] = useState<'ESCOLHA' | 'FORMULARIO' | 'SUCESSO'>('ESCOLHA');
  const [servicoSelecionado, setServicoSelecionado] = useState<ServicoIdeiaItem>(() => {
    if (servicoPreSelecionadoId) {
      const match = SERVICOS_IDEIAS_VISA.find((s) => s.id === servicoPreSelecionadoId);
      if (match) return match;
    }
    return SERVICOS_IDEIAS_VISA[0];
  });

  // Filtro de categorias no catálogo de ideias
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [buscaServico, setBuscaServico] = useState('');

  // Formulário do Munícipe
  const [nomeRequerente, setNomeRequerente] = useState(currentUser?.nome_completo || '');
  const [cpfCnpj, setCpfCnpj] = useState(currentUser?.cpf || currentUser?.cnpj || '');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [telefone, setTelefone] = useState(currentUser?.telefone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bairro, setBairro] = useState('Centro');
  const [endereco, setEndereco] = useState('');
  const [numeroComplemento, setNumeroComplemento] = useState('');
  const [descricaoDetalhada, setDescricaoDetalhada] = useState('');
  const [fotosAnexas, setFotosAnexas] = useState<string[]>([]);
  const [termoAceite, setTermoAceite] = useState(false);

  // Recibo de sucesso
  const [protocoloGerado, setProtocoloGerado] = useState<string>('');
  const [dataHoraProtocolo, setDataHoraProtocolo] = useState<string>('');

  if (!isOpen) return null;

  // Filtragem de serviços
  const servicosFiltrados = SERVICOS_IDEIAS_VISA.filter((s) => {
    const matchCat = filtroCategoria === 'TODAS' || s.categoria === filtroCategoria;
    const matchTxt =
      s.titulo.toLowerCase().includes(buscaServico.toLowerCase()) ||
      s.resumo.toLowerCase().includes(buscaServico.toLowerCase()) ||
      s.inovacaoIdeia.toLowerCase().includes(buscaServico.toLowerCase());
    return matchCat && matchTxt;
  });

  const handleSelecionarServico = (serv: ServicoIdeiaItem) => {
    setServicoSelecionado(serv);
    setEtapa('FORMULARIO');
  };

  const handleAnexarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFotosAnexas((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeRequerente.trim() || !cpfCnpj.trim() || !endereco.trim()) {
      alert('Por favor, preencha o Nome/Razão Social, CPF/CNPJ e o Endereço completo.');
      return;
    }

    if (!termoAceite) {
      alert('Por favor, confirme que as informações fornecidas são verdadeiras.');
      return;
    }

    const agora = new Date();
    // 🏛️ Regra Oficial VISA: Pelo menos 6 dígitos antes do ano (XXXXXX/AAAA) com reinício automático a cada novo ano
    let procsLista: ProcessoItem[] = processosExistentes && processosExistentes.length > 0 ? processosExistentes : [];
    if (!procsLista.length) {
      try {
        const salvos = localStorage.getItem('visa_processos');
        if (salvos) procsLista = JSON.parse(salvos);
      } catch {}
    }
    const novoProtocolo = gerarProximoProtocolo(procsLista);
    const dataHoraStr = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dataIso = agora.toISOString().split('T')[0];

    const tramitacaoInicial: TramitacaoItem = {
      id: `tram-sol-${Date.now()}`,
      data_hora: agora.toISOString().replace('T', ' ').substring(0, 16),
      tipo: 'PROTOCOLO_CRIADO',
      titulo: `Solicitação Sanitária Protocolada pelo Munícipe (${servicoSelecionado.titulo})`,
      descricao: `Demanda recebida via Portal do Munícipe sob protocolo oficial ${novoProtocolo}. Serviço solicitado: "${servicoSelecionado.titulo}". Detalhes da solicitação: "${descricaoDetalhada || 'Abertura de processo sanitário'}". Requerente: ${nomeRequerente} (Doc: ${cpfCnpj}). Aguardando triagem pela Diretoria da VISA.`,
      responsavel_nome: nomeRequerente,
      responsavel_cargo: 'REQUERENTE / CIDADÃO',
      setor_origem: 'PORTAL DO CIDADÃO',
      setor_destino: 'DIRETORIA DE VIGILÂNCIA SANITÁRIA',
      status_processo_momento: 'EM ANÁLISE'
    };

    const novoProcesso: ProcessoItem = {
      id: `proc-mun-${Date.now()}`,
      num_processo: novoProtocolo,
      prot_1doc: novoProtocolo,
      data_protocolo: dataIso,
      data_entrada: dataIso,
      cnpj_cpf: cpfCnpj.trim(),
      razao_social: razaoSocial.trim() || nomeRequerente.trim().toUpperCase(),
      nome_fantasia: nomeFantasia.trim() || razaoSocial.trim() || nomeRequerente.trim(),
      assunto: `[SOLICITAÇÃO MUNÍCIPE] ${servicoSelecionado.titulo}`,
      bairro: bairro || 'Centro',
      endereco: `${endereco.trim()}${numeroComplemento.trim() ? `, nº ${numeroComplemento.trim()}` : ''}`,
      numero_complemento: numeroComplemento.trim(),
      fiscal_responsavel: 'A Distribuir (Triagem Diretoria)',
      status: 'EM ANÁLISE',
      setor: 'OUVIDORIA / ATENDIMENTO AO CIDADÃO',
      motivacao: servicoSelecionado.titulo,
      grau_risco: servicoSelecionado.grauRiscoSugerido,
      prioridade_demanda: servicoSelecionado.grauRiscoSugerido === 'ALTO RISCO' ? 'ALTA' : 'NORMAL',
      tipo_servico: servicoSelecionado.titulo,
      telefone: telefone.trim(),
      email: email.trim(),
      observacoes: `[SOLICITAÇÃO ONLINE DO MUNÍCIPE]: ${descricaoDetalhada || 'Sem observações adicionais'}. Contato: ${telefone} | ${email}`,
      tramitacoes: [tramitacaoInicial]
    };

    onSaveProcesso(novoProcesso);

    setProtocoloGerado(novoProtocolo);
    setDataHoraProtocolo(dataHoraStr);
    setEtapa('SUCESSO');
  };

  const handleReiniciar = () => {
    setEtapa('ESCOLHA');
    setNomeRequerente(currentUser?.nome_completo || '');
    setCpfCnpj(currentUser?.cpf || currentUser?.cnpj || '');
    setRazaoSocial('');
    setNomeFantasia('');
    setEndereco('');
    setNumeroComplemento('');
    setDescricaoDetalhada('');
    setFotosAnexas([]);
    setTermoAceite(false);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn select-none text-left font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl 2xl:max-w-[96vw] xl:max-w-[95vw] h-[95vh] max-h-[96vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 my-auto">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-amber-300 shadow-md">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  💡 Inovação & Autoatendimento
                </span>
                <span className="text-xs text-blue-200 hidden sm:inline">• Balneário Camboriú</span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white mt-0.5">
                Central de Solicitações Sanitárias do Munícipe
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Passos */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                etapa === 'ESCOLHA' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              1
            </span>
            <span className={`font-bold ${etapa === 'ESCOLHA' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
              Catálogo de Ideias & Serviços
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-600">→</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                etapa === 'FORMULARIO' ? 'bg-blue-600 text-white' : etapa === 'SUCESSO' ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              2
            </span>
            <span className={`font-bold ${etapa === 'FORMULARIO' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
              Dados & Anexos
            </span>
          </div>

          <span className="text-slate-300 dark:text-slate-600">→</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                etapa === 'SUCESSO' ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              3
            </span>
            <span className={`font-bold ${etapa === 'SUCESSO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              Protocolo Gerado
            </span>
          </div>
        </div>

        {/* Conteúdo Dinâmico por Etapa */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* ==================== ETAPA 1: ESCOLHA DO SERVIÇO COM IDEIAS VISÍVEIS ==================== */}
          {etapa === 'ESCOLHA' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                    <span>💡</span> Selecione o Serviço Desejado
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Conheça as inovações, prazos médios de atendimento e documentação exigida pela Vigilância Sanitária de Balneário Camboriú.
                  </p>
                </div>

                {/* Busca rápida */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar serviço..."
                    value={buscaServico}
                    onChange={(e) => setBuscaServico(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filtro por Categoria */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'TODAS', label: 'Todos os Serviços' },
                  { id: 'LICENCIAMENTO', label: 'Alvará & Licença' },
                  { id: 'HABITE_SE', label: 'Habite-se' },
                  { id: 'AGUA', label: 'Água & Laboratório' },
                  { id: 'EVENTOS', label: 'Eventos & Feiras' },
                  { id: 'VIABILIDADE', label: 'Viabilidade CNAE' },
                  { id: 'DENUNCIA', label: 'Denúncias' },
                  { id: 'BAIXA', label: 'Baixa Sanitária' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFiltroCategoria(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filtroCategoria === cat.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grade dos Serviços com Ideias Visíveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {servicosFiltrados.map((serv) => (
                  <div
                    key={serv.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                            {serv.icone}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                              {serv.titulo}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-500" /> {serv.prazoMedio}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                  serv.grauRiscoSugerido === 'ALTO RISCO'
                                    ? 'bg-red-100 dark:bg-red-950/70 text-red-600 border border-red-300 dark:border-red-800'
                                    : serv.grauRiscoSugerido === 'MÉDIO RISCO'
                                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 border border-amber-300 dark:border-amber-800'
                                    : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 border border-emerald-300 dark:border-emerald-800'
                                }`}
                              >
                                {serv.grauRiscoSugerido}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {serv.resumo}
                      </p>

                      {/* Ideia de Inovação Visível */}
                      <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-950 dark:text-blue-200 space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-[10px] uppercase text-blue-700 dark:text-blue-400">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Ideia & Inovação VISA:
                        </div>
                        <p className="text-[11px] leading-tight text-slate-700 dark:text-slate-300">
                          {serv.inovacaoIdeia}
                        </p>
                      </div>

                      {/* Documentos Exigidos */}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1">
                        <strong className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                          Documentos necessários:
                        </strong>
                        <ul className="list-disc list-inside space-y-0.5">
                          {serv.documentosNecessarios.slice(0, 2).map((doc, i) => (
                            <li key={i} className="truncate">
                              {doc}
                            </li>
                          ))}
                          {serv.documentosNecessarios.length > 2 && (
                            <li className="text-[10px] text-blue-600 dark:text-blue-400 italic">
                              + {serv.documentosNecessarios.length - 2} outro(s) item(ns)...
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelecionarServico(serv)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition cursor-pointer active:scale-98"
                    >
                      <span>Solicitar Este Serviço</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== ETAPA 2: FORMULÁRIO DE SOLICITAÇÃO ==================== */}
          {etapa === 'FORMULARIO' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Card Resumo do Serviço Escolhido */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                    {servicoSelecionado.icone}
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                      Serviço Selecionado
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {servicoSelecionado.titulo}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Prazo estimado: <strong className="text-blue-600 dark:text-blue-400">{servicoSelecionado.prazoMedio}</strong> • {servicoSelecionado.beneficioCidadao}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEtapa('ESCOLHA')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0"
                >
                  Trocar Serviço
                </button>
              </div>

              {/* 🏢 MÓDULO DE TESTE: LINKAR COM DADOS SANITÁRIOS EXISTENTES DA VISA */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-slate-900 border-2 border-dashed border-blue-300 dark:border-blue-700/60 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-600 text-white text-xs">⚡</span>
                    <span className="text-xs font-black uppercase text-blue-950 dark:text-blue-200">
                      Testar com Estabelecimento Cadastrado na VISA (Link Instantâneo):
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-700">
                    Clique para preencher e ver o sistema reagir
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {ESTABELECIMENTOS_TESTE_LINKADOS.map((est) => (
                    <button
                      key={est.cnpj_cpf}
                      type="button"
                      onClick={() => {
                        setNomeRequerente(est.razao_social);
                        setCpfCnpj(est.cnpj_cpf);
                        setRazaoSocial(est.razao_social);
                        setNomeFantasia(est.nome_fantasia);
                        setEndereco(est.endereco);
                        setNumeroComplemento(est.numeroComplemento);
                        setBairro(est.bairro);
                        setTelefone(est.telefone);
                        setEmail(est.email);
                        setDescricaoDetalhada(`[TESTE INTEGRADO]: Solicitação vinculada aos dados prévios de ${est.nome}. Protocolo anterior registrado na base: ${est.protocoloVinculado}.`);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-950/60 text-left transition cursor-pointer space-y-1 shadow-2xs group active:scale-98"
                    >
                      <div className="font-extrabold text-xs text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate flex items-center justify-between">
                        <span>{est.nome}</span>
                        <span className="text-[10px] text-blue-500 font-bold">Usar →</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        CNPJ: {est.cnpj_cpf}
                      </div>
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold line-clamp-1">
                        {est.destaque}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dados do Requerente */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <Building2 className="w-4 h-4 text-blue-500" /> 1. Identificação do Requerente / Estabelecimento
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo do Solicitante / Responsável *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={nomeRequerente}
                      onChange={(e) => setNomeRequerente(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      CPF ou CNPJ do Requerente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Razão Social da Empresa (se aplicável)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Silva & Filhos Comércio de Alimentos LTDA"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Fantasia do Estabelecimento
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Restaurante Sabor do Mar"
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp / Telefone para Contato *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(47) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail para Notificações Oficiais
                    </label>
                    <input
                      type="email"
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Localização em Balneário Camboriú */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" /> 2. Localização do Estabelecimento ou Imóvel
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bairro em Balneário Camboriú *
                    </label>
                    <select
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                    >
                      {BAIRROS_BC.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Endereço (Rua / Avenida) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Avenida Brasil, nº 1200"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Complemento / Ponto de Referência
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 04, em frente à Praça Almirante Tamandaré"
                      value={numeroComplemento}
                      onChange={(e) => setNumeroComplemento(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição e Detalhes da Demanda */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <FileText className="w-4 h-4 text-purple-500" /> 3. Detalhamento da Solicitação
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descreva o que necessita ou detalhes específicos da sua atividade:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Solicito vistoria para concessão de alvará sanitário inicial de lanchonete com manipulação de alimentos. O imóvel já possui habite-se e laudo de bombeiros."
                    value={descricaoDetalhada}
                    onChange={(e) => setDescricaoDetalhada(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 text-xs"
                  ></textarea>
                </div>

                {/* Anexo de Fotos / Documentos */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Anexar Documentos / Fotos de Evidência (Opcional, aceita câmera e arquivos):
                  </label>
                  <div className="p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Anexe comprovantes, fotos do local ou layout sanitário para agilizar a análise da equipe.
                    </div>
                    <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer transition flex items-center gap-1.5 shrink-0 shadow">
                      <Camera className="w-4 h-4" /> Anexar Arquivos
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleAnexarFoto}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {fotosAnexas.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {fotosAnexas.map((f, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={f}
                            alt={`Anexo ${i + 1}`}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setFotosAnexas((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1 -right-1 bg-red-600 text-white p-0.5 rounded-full shadow"
                            title="Remover"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Termo de Responsabilidade */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="termo"
                  checked={termoAceite}
                  onChange={(e) => setTermoAceite(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="termo" className="text-slate-700 dark:text-slate-300 cursor-pointer leading-tight">
                  Declaro que as informações e documentos aqui fornecidos são fidedignos e assumo inteira responsabilidade civil e administrativa perante o Município de Balneário Camboriú, estando ciente de que a demanda será protocolada diretamente para triagem e despacho dos fiscais sanitários.
                </label>
              </div>

              {/* Botões de Ação do Formulário */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEtapa('ESCOLHA')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95"
                >
                  <Send className="w-4 h-4" /> Protocolar Solicitação
                </button>
              </div>
            </form>
          )}

          {/* ==================== ETAPA 3: SUCESSO & RECIBO COM PROTOCOLO ==================== */}
          {etapa === 'SUCESSO' && (
            <div className="py-6 text-center space-y-5 max-w-lg mx-auto animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-xl ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Demanda Sanitária Protocolada com Sucesso
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                  Protocolo Oficial: <span className="font-mono text-blue-600 dark:text-blue-400">{protocoloGerado}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registrado em {dataHoraProtocolo} • Vigilância Sanitária de Balneário Camboriú
                </p>
              </div>

              {/* Card de Próximos Passos */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2.5">
                <h4 className="font-black uppercase text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🚀</span> O Que Acontece Agora?
                </h4>
                <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-500 shrink-0">1.</span>
                    <span>Sua solicitação foi encaminhada para a <strong>mesa de triagem da Diretoria da VISA</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-500 shrink-0">2.</span>
                    <span>Um fiscal sanitarista da sua região será designado para instrução e eventual vistoria in loco.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-500 shrink-0">3.</span>
                    <span>Você pode acompanhar cada fase, parecer técnico e despacho do 1Doc diretamente pelo portal digitando o protocolo <strong>{protocoloGerado}</strong> ou seu documento.</span>
                  </li>
                </ul>
              </div>

              {/* Botões Finais */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition shadow cursor-pointer"
                >
                  Ir para Minhas Demandas & Acompanhamento
                </button>

                <button
                  type="button"
                  onClick={handleReiniciar}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  + Nova Solicitação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
