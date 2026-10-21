import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Droplet,
  MapPin,
  Clock,
  Leaf,
  Award,
  FileCheck2,
  Zap,
  Building2,
  Users,
  Search,
  ChevronRight
} from 'lucide-react';

export interface IdeiaInovacaoVisa {
  id: string;
  titulo: string;
  categoria: 'LICENCIAMENTO' | 'INTERATIVIDADE' | 'QUALIDADE_AGUA' | 'SUSTENTABILIDADE' | 'GEO_VISA' | 'PREVENCAO';
  icone: string;
  badge: string;
  resumo: string;
  comoFunciona: string;
  beneficioMunicipe: string;
  beneficioServidor: string;
  impactoEsperado: {
    tempo: string;
    sustentabilidade: string;
    satisfacao: string;
  };
  servicoVinculadoId?: string;
  acaoTexto: string;
}

export const IDEIAS_INOVACOES_VISA: IdeiaInovacaoVisa[] = [
  {
    id: 'alvara_24h_baixo_risco',
    titulo: 'Alvará 100% Digital em 24h (Autodeclaração de Baixo Risco)',
    categoria: 'LICENCIAMENTO',
    icone: '⚡',
    badge: 'LEI DA LIBERDADE ECONÔMICA',
    resumo: 'Emissão acelerada com assinatura digital e QR Code oficial para atividades de baixo risco sanitário.',
    comoFunciona: 'O empreendedor preenche os dados do CNPJ, assina digitalmente a autodeclaração de conformidade sanitária e o sistema gera automaticamente o alvará sanitário provisório/definitivo com validação pública.',
    beneficioMunicipe: 'Abertura imediata do negócio sem semanas de espera em filas ou agendamentos presenciais.',
    beneficioServidor: 'Desafoga os fiscais de vistorias meramente cartoriais, concentrando o efetivo em estabelecimentos de alto risco (hospitais, manipulação de carnes, farmácias).',
    impactoEsperado: {
      tempo: 'De 20 dias para menos de 24 horas',
      sustentabilidade: 'Zero papel impresso e zero deslocamento de veículos',
      satisfacao: '98% de aprovação pelo setor empresarial de BC'
    },
    servicoVinculadoId: 'alvara_inicial',
    acaoTexto: 'Solicitar Alvará Digital Inicial'
  },
  {
    id: 'cumprimento_exigencias_foto',
    titulo: 'Balcão Único de Cumprimento de Exigências pelo Celular',
    categoria: 'INTERATIVIDADE',
    icone: '📱',
    badge: 'AGILIDADE SANITÁRIA',
    resumo: 'Envio de fotos e comprovantes de adequações sanitárias diretamente pelo smartphone do munícipe.',
    comoFunciona: 'Se o fiscal notificar a falta de tela milimétrica em janela ou instalação de termômetro na geladeira, o munícipe realiza a adequação, tira foto no próprio aplicativo e envia. O fiscal analisa e defere direto no sistema.',
    beneficioMunicipe: 'Evita dias de paralisação ou interdição do negócio aguardando nova visita física do fiscal.',
    beneficioServidor: 'Elimina viagens repetidas de viatura ao mesmo endereço para checar itens simples de fácil conferência fotográfica.',
    impactoEsperado: {
      tempo: 'Resolução em até 12 horas úteis',
      sustentabilidade: 'Redução de 30% em deslocamentos de viaturas',
      satisfacao: 'Comunicação transparente em tempo real com o auditor'
    },
    servicoVinculadoId: 'denuncia_sanitaria',
    acaoTexto: 'Interagir no Meu Processo'
  },
  {
    id: 'monitoramento_agua_predial',
    titulo: 'Monitoramento Contínuo de Água Predial & Alerta Preventivo',
    categoria: 'QUALIDADE_AGUA',
    icone: '💧',
    badge: 'SAÚDE PÚBLICA BC',
    resumo: 'Laudo digital com notificação instantânea para síndicos e hoteleiros em caso de desvios físico-químicos.',
    comoFunciona: 'Condomínios residenciais e hotéis solicitam ensaios laboratoriais. Assim que o laboratório digita os dados de cloro, pH ou turbidez fora dos padrões da Portaria GM/MS 888, um protocolo emergencial de desinfecção é disparado automaticamente.',
    beneficioMunicipe: 'Garantia de água potável segura para moradores e turistas, com certificado emitido pela VISA.',
    beneficioServidor: 'Prevenção ativa de surtos de gastroenterite e doenças de veiculação hídrica na alta temporada de Balneário Camboriú.',
    impactoEsperado: {
      tempo: 'Alerta instantâneo no mesmo dia do ensaio',
      sustentabilidade: 'Preservação de recursos hídricos municipais',
      satisfacao: 'Transparência sanitária com laudo digital auditável'
    },
    servicoVinculadoId: 'analise_agua',
    acaoTexto: 'Solicitar Análise de Água Potável'
  },
  {
    id: 'selo_qualidade_bc',
    titulo: 'Selo "Qualidade Sanitária BC" com QR Code na Vitrine',
    categoria: 'PREVENCAO',
    icone: '🏆',
    badge: 'VALORIZAÇÃO TURÍSTICA',
    resumo: 'Reconhecimento oficial para restaurantes, mercados e clínicas com nota máxima em inspeção sanitária.',
    comoFunciona: 'Locais que cumprem integralmente as Boas Práticas Sanitárias recebem um selo oficial holográfico e digital com QR Code. O munícipe e o turista apontam a câmera e visualizam a regularidade do local.',
    beneficioMunicipe: 'Segurança absoluta ao escolher onde se alimentar, hospedar-se ou receber atendimento médico.',
    beneficioServidor: 'Estimula a autorregulação e conformidade voluntária do comércio sem necessidade de medidas punitivas.',
    impactoEsperado: {
      tempo: 'Válido por 12 meses com revalidação automática',
      sustentabilidade: 'Digitalização completa do guia turístico sanitário',
      satisfacao: 'Diferencial competitivo e atração de clientes qualificados'
    },
    servicoVinculadoId: 'renovacao_alvara',
    acaoTexto: 'Solicitar Renovação & Selo de Qualidade'
  },
  {
    id: 'roteirizacao_viatura_verde',
    titulo: 'Roteirização Inteligente & Viatura Sanitária Verde (GEO VISA)',
    categoria: 'GEO_VISA',
    icone: '🗺️',
    badge: 'ECO-EFICIÊNCIA & FROTA',
    resumo: 'Agrupamento automático de inspeções por bairro de BC com algoritmo de otimização de menor trajeto.',
    comoFunciona: 'O GEO VISA calcula a menor rota entre estabelecimentos pendentes nos bairros Centro, Nações, Barra e Praia dos Amores, sugerindo a sequência exata de paradas e exportando rota para o Google Maps/Waze da viatura.',
    beneficioMunicipe: 'Fiscais chegam mais rápido às demandas de emergência e denúncias graves.',
    beneficioServidor: 'Menos tempo perdido no trânsito intenso da cidade e planejamento diário pronto em 1 clique.',
    impactoEsperado: {
      tempo: 'Ganho de 2 horas por dia por equipe de campo',
      sustentabilidade: 'Economia estimada de 35% de combustível da frota',
      satisfacao: 'Aumento de 40% na capacidade diária de vistorias'
    },
    servicoVinculadoId: 'habite_se_sanitario',
    acaoTexto: 'Conferir Mapa de Demandas GEO VISA'
  },
  {
    id: 'notificacao_preventiva_30d',
    titulo: 'Notificação Ativa de Vencimento de Licença com 30 Dias de Antecedência',
    categoria: 'LICENCIAMENTO',
    icone: '🔔',
    badge: 'SEM BUROCRACIA',
    resumo: 'Aviso prévio amigável para comerciantes e escritórios contábeis evitarem penalidades por alvará expirado.',
    comoFunciona: 'O motor de regras da VISA identifica os alvarás com validade nos próximos 30 a 60 dias e envia alertas automáticos com o link direto para pagamento de taxas e renovação simplificada.',
    beneficioMunicipe: 'Nunca mais seja surpreendido com autuações ou paralisação de atividade por esquecimento de prazo.',
    beneficioServidor: 'Reduz a sobrecarga de atendimentos emergenciais no balcão e nivelamento do fluxo anual de trabalho.',
    impactoEsperado: {
      tempo: 'Renovação sem interrupção de faturamento',
      sustentabilidade: 'Fluxo 100% digital sem envio de notificações impressas',
      satisfacao: 'Parceria e apoio institucional da VISA ao empresário local'
    },
    servicoVinculadoId: 'renovacao_alvara',
    acaoTexto: 'Acompanhar Validade do Meu Alvará'
  },
  {
    id: 'vistoria_orientativa_obra',
    titulo: 'Vistoria Preventiva Orientativa Pré-Reforma (Evita Custos)',
    categoria: 'PREVENCAO',
    icone: '🧭',
    badge: 'CONSULTORIA PREVENTIVA',
    resumo: 'Agendamento de orientação in loco antes da reforma ou abertura para acertar layout físico e fluxos.',
    comoFunciona: 'Antes de investir alto em revestimentos, exaustores ou canalizações, o arquiteto ou comerciante solicita uma vistoria de alinhamento com a VISA. O auditor orienta os fluxos de alimentos e descarte de resíduos.',
    beneficioMunicipe: 'Economia de milhares de reais evitando ter que quebrar alvenaria ou trocar pisos já assentados.',
    beneficioServidor: 'Garante que os novos estabelecimentos comecem operando em 100% de conformidade com o Código Sanitário.',
    impactoEsperado: {
      tempo: 'Evita atrasos de meses na inauguração',
      sustentabilidade: 'Menos entulho de obra e desperdício de material',
      satisfacao: 'Sensação real de que o poder público apoia o desenvolvimento'
    },
    servicoVinculadoId: 'habite_se_sanitario',
    acaoTexto: 'Solicitar Habite-se / Vistoria Prévia'
  },
  {
    id: 'descarte_reverso_medicamentos',
    titulo: 'Logística Reversa & Descarte Consciente de Medicamentos e Perfurocortantes',
    categoria: 'SUSTENTABILIDADE',
    icone: '🌿',
    badge: 'PROTEÇÃO AMBIENTAL',
    resumo: 'Mapeamento de postos e farmácias de BC para descarte correto de remédios vencidos e agulhas.',
    comoFunciona: 'Munícipes encontram no mapa do aplicativo os pontos credenciados de descarte seguro. Estabelecimentos parceiros ganham selo de responsabilidade ambiental e dados de coleta são consolidados pela DVIS.',
    beneficioMunicipe: 'Descarte seguro e responsável sem contaminar a água do lençol freático, rios e a praia de Balneário Camboriú.',
    beneficioServidor: 'Proteção sanitária do ecossistema e cumprimento da Política Nacional de Resíduos Sólidos.',
    impactoEsperado: {
      tempo: 'Acesso imediato à lista de farmácias coletoras',
      sustentabilidade: 'Destinação correta por incineração e autoclave',
      satisfacao: 'Cidade mais limpa, verde e sustentável'
    },
    servicoVinculadoId: 'baixa_sanitaria',
    acaoTexto: 'Saber Mais Sobre Descarte Seguro'
  }
];

export interface IdeiasInovacoesVisaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectServico?: (servicoId: string) => void;
  onSelecionarServico?: (servicoId: string) => void;
  onAbrirAcompanhamento?: () => void;
  onVerComoServidor?: () => void;
  onNavigate?: (view: string) => void;
}

export const IdeiasInovacoesVisaModal: React.FC<IdeiasInovacoesVisaModalProps> = ({
  isOpen,
  onClose,
  onSelectServico,
  onSelecionarServico,
  onAbrirAcompanhamento,
  onVerComoServidor,
  onNavigate
}) => {
  const handleSelectServico = (servicoId: string) => {
    if (onSelecionarServico) onSelecionarServico(servicoId);
    if (onSelectServico) onSelectServico(servicoId);
  };
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [ideiaExpandidaId, setIdeiaExpandidaId] = useState<string | null>(IDEIAS_INOVACOES_VISA[0].id);

  if (!isOpen) return null;

  const categorias = [
    { id: 'TODAS', label: 'Todas as Ideias', icon: '✨' },
    { id: 'LICENCIAMENTO', label: 'Licenciamento 24h', icon: '⚡' },
    { id: 'INTERATIVIDADE', label: 'Cidadão & Fiscal', icon: '📱' },
    { id: 'QUALIDADE_AGUA', label: 'Água & Laboratório', icon: '💧' },
    { id: 'GEO_VISA', label: 'GEO VISA & Rotas', icon: '🗺️' },
    { id: 'PREVENCAO', label: 'Prevenção & Selo BC', icon: '🏆' },
    { id: 'SUSTENTABILIDADE', label: 'Sustentabilidade', icon: '🌿' }
  ];

  const ideiasFiltradas = IDEIAS_INOVACOES_VISA.filter((i) => {
    const matchCat = categoriaAtiva === 'TODAS' || i.categoria === categoriaAtiva;
    const matchTxt =
      i.titulo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      i.resumo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      i.comoFunciona.toLowerCase().includes(termoBusca.toLowerCase()) ||
      i.badge.toLowerCase().includes(termoBusca.toLowerCase());
    return matchCat && matchTxt;
  });

  const handleActionClick = (ideia: IdeiaInovacaoVisa) => {
    onClose();
    if (ideia.id === 'roteirizacao_viatura_verde' && onNavigate) {
      onNavigate('geo_visa');
      return;
    }
    if (ideia.servicoVinculadoId) {
      handleSelectServico(ideia.servicoVinculadoId);
    } else if (onNavigate) {
      onNavigate('cidadao');
    }
  };

  return (
    <div className="fixed inset-0 z-[1250] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn select-none text-left font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* CABEÇALHO DO PAINEL DE IDEIAS */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-blue-800/60 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                Inovações & Modernização Pública
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Banco de Ideias & Serviços da Vigilância Sanitária
              </h2>
              <p className="text-xs text-blue-200/90 max-w-xl">
                Propostas inteligentes desenvolvidas para conectar o munícipe aos servidores da VISA de Balneário Camboriú com máxima agilidade, transparência e redução de custos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition cursor-pointer shrink-0 relative z-10"
            title="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BARRA DE FILTROS & BUSCA */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Pesquisar ideia ou inovação (ex: Alvará 24h, fotos no celular, água, rotas)..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              />
            </div>
            <span className="text-xs text-slate-500 font-bold shrink-0">
              {ideiasFiltradas.length} inovação(ões) cadastrada(s)
            </span>
          </div>

          {/* Chips de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  categoriaAtiva === cat.id
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CORPO: LISTA DE IDEIAS & CARDS INTERATIVOS */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideiasFiltradas.map((ideia) => {
              const isExpandido = ideiaExpandidaId === ideia.id;

              return (
                <div
                  key={ideia.id}
                  className={`rounded-2xl border transition shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-4 ${
                    isExpandido
                      ? 'bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-slate-800 dark:to-slate-850 border-blue-400 dark:border-blue-500/60 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow flex items-center justify-center text-2xl shrink-0">
                          {ideia.icone}
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                            {ideia.badge}
                          </span>
                          <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white mt-1 leading-snug">
                            {ideia.titulo}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {ideia.resumo}
                    </p>

                    {/* Detalhes de Funcionamento & Benefícios Duplos */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-750 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-slate-200 block mb-0.5 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> Como Funciona na Prática:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {ideia.comoFunciona}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200">
                          <span className="font-black text-[10px] uppercase block mb-0.5 flex items-center gap-1">
                            <span>🏛️</span> Munícipe & Comércio:
                          </span>
                          <p className="text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-300 font-medium">
                            {ideia.beneficioMunicipe}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-200">
                          <span className="font-black text-[10px] uppercase block mb-0.5 flex items-center gap-1">
                            <span>🛡️</span> Servidores & VISA:
                          </span>
                          <p className="text-[10px] leading-relaxed text-indigo-800 dark:text-indigo-300 font-medium">
                            {ideia.beneficioServidor}
                          </p>
                        </div>
                      </div>

                      {/* Métricas e Impacto */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono text-[9px]">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 block text-[8px] font-sans uppercase">Prazo SLA</span>
                          <strong className="text-slate-800 dark:text-slate-200 block truncate">{ideia.impactoEsperado.tempo}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 block text-[8px] font-sans uppercase">Sustentável</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 block truncate">{ideia.impactoEsperado.sustentabilidade}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 block text-[8px] font-sans uppercase">Aprovação</span>
                          <strong className="text-blue-600 dark:text-blue-400 block truncate">{ideia.impactoEsperado.satisfacao}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ação Interativa no Rodapé do Card */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick(ideia)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{ideia.acaoTexto}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RODAPÉ DO MODAL COM RESUMO */}
        <div className="p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Todas as 8 ideias contam com fluxos já mapeados na plataforma para atender Balneário Camboriú.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
