import React, { useState } from 'react';
import {
  EscalaItem,
  FeiranteItem,
  FiscalizacaoItem,
  HabiteSeRegistroItem,
  PastaVisaItem,
  ProcessoItem,
  SetorDemanda,
  UserProfile,
} from '../../types';
import {
  cleanDoc,
  formatDoc,
  getDisplayPastaNumero,
  isValidDocLength,
  obterOuCriarPastaPorCpfCnpj,
} from '../../lib/pastaVisaService';
import { saveHabiteSeRegistro } from '../../lib/interlaceServices';
import { fetchCnpj } from '../../lib/cnpjService';
import { BAIRROS_BC } from '../../data/mockData';
import { Search, X } from 'lucide-react';

export type SinncWorkflowModalKind =
  | null
  | 'nova_demanda'
  | 'nova_vistoria'
  | 'novo_habite_se'
  | 'novo_feirante';

interface SinncDemoWorkflowModalsProps {
  modalKind: SinncWorkflowModalKind;
  initialPasta?: PastaVisaItem | null;
  currentUser: UserProfile | null;
  users: UserProfile[];
  onClose: () => void;
  onSaveProcesso: (item: ProcessoItem) => Promise<void> | void;
  onSaveFiscalizacao?: (item: FiscalizacaoItem) => Promise<void> | void;
  onSaveEscalaItem?: (item: EscalaItem) => Promise<void> | void;
  onSaveFeirante?: (item: FeiranteItem) => Promise<void> | void;
  onCreatedPasta?: (pasta: PastaVisaItem) => void;
}

export const SinncDemoWorkflowModals: React.FC<SinncDemoWorkflowModalsProps> = ({
  modalKind,
  initialPasta,
  currentUser,
  users,
  onClose,
  onSaveProcesso,
  onSaveFiscalizacao,
  onSaveEscalaItem,
  onSaveFeirante,
  onCreatedPasta,
}) => {
  const [origem, setOrigem] = useState<'PORTAL_MUNICIPE' | 'PORTAL_CONTADOR' | 'DENUNCIA_ANONIMA' | 'RECEPCAO_VISA'>('PORTAL_MUNICIPE');
  const [doc, setDoc] = useState(initialPasta?.cnpj_cpf || '');
  const [pastaFisicaOpcional, setPastaFisicaOpcional] = useState('');
  const [razao, setRazao] = useState(initialPasta?.razao_social || '');
  const [assunto, setAssunto] = useState('Solicitação de Alvará Sanitário Inicial');
  const [setor, setSetor] = useState<SetorDemanda>('ALIMENTOS');
  const [bairro, setBairro] = useState(initialPasta?.bairro || 'Centro');
  const [endereco, setEndereco] = useState(initialPasta?.endereco || '');
  const [observacoes, setObservacoes] = useState('');
  const [loadingRf, setLoadingRf] = useState(false);
  const [saving, setSaving] = useState(false);

  // Vistoria & Auto-Agenda state
  const [tipoVistoria, setTipoVistoria] = useState<FiscalizacaoItem['tipoVistoria']>('ROTINA');
  const [medida, setMedida] = useState('Termo de Intimação (Prazo de Adequação)');
  const [statusFisc, setStatusFisc] = useState<FiscalizacaoItem['status']>('NOTIFICADO');
  const [prazoDias, setPrazoDias] = useState<number>(15);
  const [vincularProcessoId, setVincularProcessoId] = useState('');

  // Habite-se state
  const [nomeEdificacao, setNomeEdificacao] = useState('');
  const [tipoPeticao, setTipoPeticao] = useState<'TOTAL' | 'PARCIAL'>('TOTAL');
  const [numeroDic, setNumeroDic] = useState('');
  const [rtNome, setRtNome] = useState('');
  const [rtRegistro, setRtRegistro] = useState('');
  const [areaM2, setAreaM2] = useState('');

  // Feiras state
  const [feiraNome, setFeiraNome] = useState('Feira da Cultura');
  const [codigoBox, setCodigoBox] = useState('BOX-01');
  const [produtosFeira, setProdutosFeira] = useState('Alimentos artesanais / Hortifruti');

  if (!modalKind) return null;

  const fiscaisLista = users.filter(
    (u) => !u.tipo_usuario || u.tipo_usuario === 'SERVIDOR'
  );

  const handleConsultarCnpj = async () => {
    const limpo = cleanDoc(doc);
    if (limpo.length !== 14) return;
    setLoadingRf(true);
    try {
      const rf = await fetchCnpj(limpo);
      if (rf) {
        setRazao(rf.razao || razao);
        setEndereco(`${rf.rua_api || ''} ${rf.num_api ? `, ${rf.num_api}` : ''}`.trim() || endereco);
        setBairro(rf.bairro || bairro);
      }
    } finally {
      setLoadingRf(false);
    }
  };

  const handleSubmitNovaDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isAnonima = origem === 'DENUNCIA_ANONIMA' && !isValidDocLength(doc);
      let pastaResolvida: PastaVisaItem | null = null;
      let numPasta = '';
      const limpo = cleanDoc(doc);

      if (!isAnonima && isValidDocLength(limpo)) {
        const res = await obterOuCriarPastaPorCpfCnpj(limpo, {
          razao_social: razao,
          setor,
          bairro,
          endereco,
          pasta_fisica_informada: pastaFisicaOpcional || undefined,
          criado_por: currentUser?.nome_completo || 'Capa Teste Full',
        });
        pastaResolvida = res.pasta;
        numPasta = getDisplayPastaNumero(res.pasta);
        if (onCreatedPasta) onCreatedPasta(res.pasta);
      }

      const now = new Date();
      const prot = `${now.getFullYear()}-${String(Math.floor(10000 + Math.random() * 89999))}`;
      const prazoDate = new Date(now);
      prazoDate.setDate(prazoDate.getDate() + 10);

      const novoProc: ProcessoItem = {
        id: `proc-${Date.now()}`,
        num_processo: prot,
        prot_1doc: prot,
        data_protocolo: now.toISOString().slice(0, 10),
        data_entrada: now.toISOString().slice(0, 10),
        prazo_vistoria: prazoDate.toISOString().slice(0, 10),
        cnpj_cpf: isAnonima ? '' : formatDoc(limpo || doc),
        cpf_cnpj_limpo: isAnonima ? undefined : limpo,
        pasta: numPasta,
        numero_pasta: numPasta,
        razao_social: pastaResolvida?.razao_social || razao || (isAnonima ? 'DENÚNCIA ANÔNIMA (AGUARDANDO VINCULAÇÃO)' : 'REQUERENTE'),
        nome_fantasia: pastaResolvida?.razao_social || razao || 'Estabelecimento',
        assunto: origem === 'DENUNCIA_ANONIMA' ? `Denúncia Sanitária — ${assunto}` : assunto,
        setor: origem === 'DENUNCIA_ANONIMA' ? 'OUVIDORIA & DENÚNCIAS' : setor,
        motivacao: origem === 'DENUNCIA_ANONIMA' ? 'DENÚNCIA' : origem,
        origem_solicitacao: origem,
        bairro,
        endereco: endereco || pastaResolvida?.endereco || 'Balneário Camboriú',
        fiscal_responsavel: 'Aguardando Diretoria',
        status: 'EM ANÁLISE',
        grau_risco: (pastaResolvida?.grau_risco as any) || 'MÉDIO RISCO',
        observacoes: observacoes || (numPasta ? `Protocolo vinculado automaticamente à Pasta VISA ${numPasta}.` : 'Denúncia em triagem sem CPF/CNPJ inicial.'),
        tramitacoes: [
          {
            id: `tram-init-${Date.now()}`,
            data_hora: now.toISOString(),
            tipo: 'PROTOCOLO_CRIADO',
            titulo: numPasta ? `Demanda aberta na Pasta VISA ${numPasta}` : 'Demanda aberta em triagem (sem CPF/CNPJ)',
            descricao: assunto,
            responsavel_nome: currentUser?.nome_completo || 'Portal Digital VISA',
            status_processo_momento: 'EM ANÁLISE',
          },
        ],
      };

      await onSaveProcesso(novoProc);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitNovaVistoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const limpo = cleanDoc(doc);
      let pastaResolvida = initialPasta || null;
      if (!pastaResolvida && isValidDocLength(limpo)) {
        const res = await obterOuCriarPastaPorCpfCnpj(limpo, {
          razao_social: razao,
          bairro,
          endereco,
          criado_por: currentUser?.nome_completo || 'Fiscalização VISA',
        });
        pastaResolvida = res.pasta;
        if (onCreatedPasta) onCreatedPasta(res.pasta);
      }

      const numPasta = getDisplayPastaNumero(pastaResolvida);
      const now = new Date();
      const fiscProt = `FISC-${now.getFullYear()}/${String(Math.floor(100 + Math.random() * 899))}`;
      const fiscalNome = currentUser?.nome_completo || fiscaisLista[0]?.nome_completo || 'Auditor Fiscal';

      const novaFisc: FiscalizacaoItem = {
        id: `fisc-${Date.now()}`,
        protocolo: fiscProt,
        dataHora: now.toISOString(),
        fiscalId: currentUser?.id || 'fiscal-1',
        fiscalNome,
        numero_pasta: numPasta,
        cpf_cnpj_limpo: limpo || undefined,
        numProcesso: vincularProcessoId || undefined,
        estabelecimento: {
          nomeFantasia: pastaResolvida?.razao_social || razao || 'Estabelecimento',
          razaoSocial: pastaResolvida?.razao_social || razao || 'Estabelecimento',
          cnpjCpf: formatDoc(limpo || doc),
          tipo: pastaResolvida?.setor || 'Vigilância Sanitária',
          bairro,
          endereco: endereco || pastaResolvida?.endereco || 'Balneário Camboriú',
          numero: 'S/N',
          responsavel: razao || 'Responsável',
          telefone: pastaResolvida?.telefone || '',
        },
        tipoVistoria,
        risco: 'MÉDIO',
        status: statusFisc,
        checklists: [],
        irregularidadesEncontradas: statusFisc === 'CONFORME' ? [] : [observacoes || 'Adequação sanitária solicitada'],
        medidasAdotadas: medida,
        prazoAdequacaoDias: statusFisc === 'NOTIFICADO' ? prazoDias : undefined,
        observacoesFiscais: observacoes || `${medida} lavrado na Pasta ${numPasta || 'S/N'}.`,
        fotosUrl: [],
      };

      if (onSaveFiscalizacao) {
        await onSaveFiscalizacao(novaFisc);
      }

      // PASSO 4: Se houver notificação com prazo, cria automaticamente lembrete de retorno na Agenda!
      if (statusFisc === 'NOTIFICADO' && prazoDias > 0 && onSaveEscalaItem) {
        const retornoDate = new Date(now);
        retornoDate.setDate(retornoDate.getDate() + prazoDias);
        const agendaItem: EscalaItem = {
          id: `esc-ret-${Date.now()}`,
          data: retornoDate.toISOString().slice(0, 10),
          tipo: 'EVENTO',
          servidores: fiscalNome,
          fiscal: fiscalNome,
          descricao: `Retorno de Notificação (${fiscProt}) · Pasta ${numPasta || 'S/N'} · ${pastaResolvida?.razao_social || razao}`,
        };
        await onSaveEscalaItem(agendaItem);
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitHabiteSe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDocLength(doc)) return;
    setSaving(true);
    try {
      const limpo = cleanDoc(doc);
      const { pasta } = await obterOuCriarPastaPorCpfCnpj(limpo, {
        razao_social: razao,
        setor: 'HABITE-SE SANITÁRIO',
        bairro,
        endereco,
        criado_por: currentUser?.nome_completo || 'Habite-se VISA',
      });
      if (onCreatedPasta) onCreatedPasta(pasta);
      const numPasta = getDisplayPastaNumero(pasta);
      const now = new Date();
      const numProt = `HAB-${now.getFullYear()}/${String(Math.floor(100 + Math.random() * 899))}`;
      const procId = `proc-hab-${Date.now()}`;

      const habite: HabiteSeRegistroItem = {
        id: `hab-${Date.now()}`,
        numero_protocolo: numProt,
        numero_pasta: numPasta,
        cpf_cnpj_limpo: limpo,
        cnpj_cpf: formatDoc(limpo),
        titular_nome: pasta.razao_social || razao,
        nome_edificacao: nomeEdificacao || pasta.razao_social || razao,
        tipo_peticao: tipoPeticao,
        endereco,
        bairro,
        numero_dic: numeroDic,
        rt_nome: rtNome,
        rt_registro: rtRegistro,
        area_total_m2: areaM2,
        fiscal_responsavel: 'Aguardando Diretoria',
        status: 'EM ANÁLISE',
        processo_id: procId,
        observacoes,
        criado_em: now.toISOString(),
      };
      await saveHabiteSeRegistro(habite);

      const procHabite: ProcessoItem = {
        id: procId,
        num_processo: numProt,
        data_protocolo: now.toISOString().slice(0, 10),
        cnpj_cpf: formatDoc(limpo),
        cpf_cnpj_limpo: limpo,
        pasta: numPasta,
        numero_pasta: numPasta,
        razao_social: pasta.razao_social || razao,
        nome_fantasia: nomeEdificacao || pasta.razao_social || razao,
        assunto: `Habite-se Sanitário (${tipoPeticao}) · DIC ${numeroDic || 'S/N'}`,
        setor: 'HABITE-SE SANITÁRIO',
        bairro,
        endereco,
        fiscal_responsavel: 'Aguardando Diretoria',
        status: 'EM ANÁLISE',
        observacoes: `Edificação: ${nomeEdificacao} · RT: ${rtNome} (${rtRegistro}) · Área: ${areaM2 || '—'} m²`,
      };
      await onSaveProcesso(procHabite);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFeirante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDocLength(doc)) return;
    setSaving(true);
    try {
      const limpo = cleanDoc(doc);
      const { pasta } = await obterOuCriarPastaPorCpfCnpj(limpo, {
        razao_social: razao,
        setor: 'EVENTOS & FEIRAS',
        bairro,
        endereco,
        criado_por: currentUser?.nome_completo || 'Feiras VISA',
      });
      if (onCreatedPasta) onCreatedPasta(pasta);
      const numPasta = getDisplayPastaNumero(pasta);

      const item: FeiranteItem = {
        id: `fei-${Date.now()}`,
        data_prot: new Date().toISOString().slice(0, 10),
        num_prot: codigoBox,
        feira: feiraNome,
        pasta: numPasta,
        numero_pasta: numPasta,
        cpf_cnpj_limpo: limpo,
        cpf: limpo.length === 11 ? formatDoc(limpo) : '',
        cnpj: limpo.length === 14 ? formatDoc(limpo) : '',
        nome_pf: razao || pasta.razao_social,
        razao: pasta.razao_social || razao,
        produtos: produtosFeira,
        validade: `${new Date().getFullYear()}-12-31`,
        rua: endereco || 'Área da Feira',
        num: codigoBox,
        bairro,
        vinculo: 'SIM',
        alvara: 'EM ANDAMENTO',
      };
      if (onSaveFeirante) {
        await onSaveFeirante(item);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const titles: Record<Exclude<SinncWorkflowModalKind, null>, string> = {
    nova_demanda: 'Nova Demanda / Protocolo Digital (Auto-Pasta Híbrida)',
    nova_vistoria: 'Registrar Vistoria / Notificação (Com Lembrete na Agenda)',
    novo_habite_se: 'Novo Requerimento de Habite-se Sanitário (LC 40/2019)',
    novo_feirante: 'Vincular Feirante / Box à Pasta VISA',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4 text-left" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{titles[modalKind]}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {modalKind === 'nova_demanda' && (
          <form onSubmit={handleSubmitNovaDemanda} className="p-5 space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Canal de Entrada</label>
                <select value={origem} onChange={(e) => setOrigem(e.target.value as any)} className="w-full !text-xs !py-2 !px-2.5">
                  <option value="PORTAL_MUNICIPE">Portal do Cidadão</option>
                  <option value="PORTAL_CONTADOR">Portal do Contador</option>
                  <option value="RECEPCAO_VISA">Recepção / Novo Processo</option>
                  <option value="DENUNCIA_ANONIMA">Denúncia (Anônima ou Identificada)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Setor Técnico</label>
                <select value={setor} onChange={(e) => setSetor(e.target.value as SetorDemanda)} className="w-full !text-xs !py-2 !px-2.5">
                  <option value="ALIMENTOS">Alimentos & Bebidas</option>
                  <option value="SAÚDE">Serviços de Saúde</option>
                  <option value="FARMÁCIAS & MEDICAMENTOS">Farmácias & Medicamentos</option>
                  <option value="SANEAMENTO & AMBIENTAL">Saneamento & Ambiental</option>
                  <option value="EVENTOS & FEIRAS">Feiras & Ambulantes</option>
                  <option value="GERAL">Atividades Gerais</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  CPF ou CNPJ {origem === 'DENUNCIA_ANONIMA' ? '(opcional se anônima)' : '*'}
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={doc}
                    onChange={(e) => setDoc(e.target.value)}
                    placeholder="Somente dígitos ou formatado"
                    className="w-full !text-xs !py-2 !px-2.5 font-mono"
                    required={origem !== 'DENUNCIA_ANONIMA'}
                  />
                  <button
                    type="button"
                    onClick={handleConsultarCnpj}
                    disabled={loadingRf || cleanDoc(doc).length !== 14}
                    className="px-2.5 py-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0"
                    title="Consultar Receita Federal"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Pasta física existente (opcional, se houver)
                </label>
                <input
                  type="text"
                  value={pastaFisicaOpcional}
                  onChange={(e) => setPastaFisicaOpcional(e.target.value)}
                  placeholder="Vazio = gera 6 dígitos automático"
                  className="w-full !text-xs !py-2 !px-2.5 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Razão Social / Nome</label>
                <input
                  type="text"
                  value={razao}
                  onChange={(e) => setRazao(e.target.value)}
                  placeholder="Preenchido pela RFB se CNPJ novo"
                  className="w-full !text-xs !py-2 !px-2.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Bairro</label>
                <select value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full !text-xs !py-2 !px-2.5">
                  {BAIRROS_BC.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Assunto da Demanda</label>
              <input
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                required
                className="w-full !text-xs !py-2 !px-2.5"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Endereço / Observações</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número e complemento"
                className="w-full !text-xs !py-2 !px-2.5 mb-2"
              />
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes adicionais da solicitação ou denúncia..."
                className="w-full !text-xs !p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white font-medium cursor-pointer">
                {saving ? 'Vinculando Pasta...' : 'Protocolar com Pasta VISA'}
              </button>
            </div>
          </form>
        )}

        {modalKind === 'nova_vistoria' && (
          <form onSubmit={handleSubmitNovaVistoria} className="p-5 space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CPF / CNPJ do Alvo *</label>
                <input type="text" value={doc} onChange={(e) => setDoc(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Razão Social / Nome</label>
                <input type="text" value={razao} onChange={(e) => setRazao(e.target.value)} className="w-full !text-xs !py-2 !px-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo</label>
                <select value={tipoVistoria} onChange={(e) => setTipoVistoria(e.target.value as any)} className="w-full !text-xs !py-2 !px-2.5">
                  <option value="ROTINA">Rotina</option>
                  <option value="DENÚNCIA">Denúncia</option>
                  <option value="RENOVAÇÃO">Renovação</option>
                  <option value="REINSPEÇÃO">Reinspeção</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Situação Resultante</label>
                <select value={statusFisc} onChange={(e) => setStatusFisc(e.target.value as any)} className="w-full !text-xs !py-2 !px-2.5">
                  <option value="NOTIFICADO">Notificado (Auto-Agenda)</option>
                  <option value="CONFORME">Conforme</option>
                  <option value="CONCLUIDA">Concluída</option>
                  <option value="INTERDITADO">Interditado</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Prazo Adequação (dias)</label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={prazoDias}
                  onChange={(e) => setPrazoDias(Number(e.target.value))}
                  disabled={statusFisc !== 'NOTIFICADO'}
                  className="w-full !text-xs !py-2 !px-2.5 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Medida Adotada / Termo</label>
              <input type="text" value={medida} onChange={(e) => setMedida(e.target.value)} className="w-full !text-xs !py-2 !px-2.5" />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Irregularidades / Observações Fiscais</label>
              <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="w-full !text-xs !p-2.5" />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white font-medium cursor-pointer">
                {saving ? 'Registrando...' : 'Salvar Vistoria e Criar Lembrete'}
              </button>
            </div>
          </form>
        )}

        {modalKind === 'novo_habite_se' && (
          <form onSubmit={handleSubmitHabiteSe} className="p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CPF / CNPJ do Titular *</label>
                <input type="text" value={doc} onChange={(e) => setDoc(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Titular / Construtora *</label>
                <input type="text" value={razao} onChange={(e) => setRazao(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome da Edificação *</label>
                <input type="text" value={nomeEdificacao} onChange={(e) => setNomeEdificacao(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo</label>
                <select value={tipoPeticao} onChange={(e) => setTipoPeticao(e.target.value as any)} className="w-full !text-xs !py-2 !px-2.5">
                  <option value="TOTAL">Total</option>
                  <option value="PARCIAL">Parcial</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nº DIC</label>
                <input type="text" value={numeroDic} onChange={(e) => setNumeroDic(e.target.value)} className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Área (m²)</label>
                <input type="text" value={areaM2} onChange={(e) => setAreaM2(e.target.value)} className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Bairro</label>
                <select value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full !text-xs !py-2 !px-2.5">
                  {BAIRROS_BC.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Responsável Técnico (RT)</label>
                <input type="text" value={rtNome} onChange={(e) => setRtNome(e.target.value)} className="w-full !text-xs !py-2 !px-2.5" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CREA / CAU</label>
                <input type="text" value={rtRegistro} onChange={(e) => setRtRegistro(e.target.value)} className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white font-medium cursor-pointer">
                {saving ? 'Gravando...' : 'Protocolar Habite-se na Pasta'}
              </button>
            </div>
          </form>
        )}

        {modalKind === 'novo_feirante' && (
          <form onSubmit={handleSubmitFeirante} className="p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CPF ou MEI/CNPJ do Feirante *</label>
                <input type="text" value={doc} onChange={(e) => setDoc(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Código Físico Box / Banca *</label>
                <input type="text" value={codigoBox} onChange={(e) => setCodigoBox(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome / Razão Social *</label>
                <input type="text" value={razao} onChange={(e) => setRazao(e.target.value)} required className="w-full !text-xs !py-2 !px-2.5" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Feira / Evento</label>
                <select value={feiraNome} onChange={(e) => setFeiraNome(e.target.value)} className="w-full !text-xs !py-2 !px-2.5">
                  <option value="Feira da Cultura">Feira da Cultura</option>
                  <option value="Feira da Barra">Feira da Barra</option>
                  <option value="Feira da Rua 200">Feira da Rua 200</option>
                  <option value="Feira do Pescador">Feira do Pescador</option>
                  <option value="Ambulante / Sazonal">Ambulante / Sazonal</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Produtos Comercializados</label>
              <input type="text" value={produtosFeira} onChange={(e) => setProdutosFeira(e.target.value)} className="w-full !text-xs !py-2 !px-2.5" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white font-medium cursor-pointer">
                {saving ? 'Vinculando...' : 'Vincular Box à Pasta VISA'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
