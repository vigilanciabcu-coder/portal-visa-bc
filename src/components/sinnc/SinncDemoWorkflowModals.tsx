import React, { useEffect, useMemo, useState } from 'react';
import {
  CidadaoProfile,
  ContabilidadeProfile,
  ContribuinteProfile,
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
  loadAllPastasUnificadas,
  obterOuCriarPastaPorCpfCnpj,
} from '../../lib/pastaVisaService';
import { saveHabiteSeRegistro } from '../../lib/interlaceServices';
import { saveContabilidadeToSupabase } from '../../lib/supabaseService';
import { fetchCnpj } from '../../lib/cnpjService';
import { BAIRROS_BC, INITIAL_CIDADAOS, INITIAL_CONTRIBUINTES } from '../../data/mockData';
import { ContabilidadeClienteOption, ExternalUserScope, safeReadLocalArray } from './sinncTypes';
import { Info, Paperclip, Search, X } from 'lucide-react';

export type SinncWorkflowModalKind =
  | null
  | 'nova_demanda'
  | 'nova_vistoria'
  | 'novo_habite_se'
  | 'novo_feirante';

export interface SinncServicoCatalogoItem {
  id: string;
  titulo: string;
  grupo: string;
  setorPadrao: SetorDemanda;
  motivacao: string;
  prazoInfo: string;
  resumo: string;
}

export const SINNC_SERVICOS_CATALOG: SinncServicoCatalogoItem[] = [
  {
    id: 'alvara_inicial',
    titulo: 'Solicitação de Alvará Sanitário Inicial',
    grupo: 'Licenciamento',
    setorPadrao: 'ALIMENTOS',
    motivacao: 'ALVARÁ SANITÁRIO INICIAL',
    prazoInfo: 'Análise inicial em 3 a 5 dias úteis',
    resumo: 'Licenciamento inicial de estabelecimento comercial, industrial ou de serviços sujeito à VISA.',
  },
  {
    id: 'renovacao_alvara',
    titulo: 'Renovação de Alvará Sanitário',
    grupo: 'Licenciamento',
    setorPadrao: 'ALIMENTOS',
    motivacao: 'RENOVAÇÃO DE ALVARÁ',
    prazoInfo: 'Renovação periódica anual',
    resumo: 'Revalidação do alvará sanitário vigente do estabelecimento, transporte ou ponto fixo.',
  },
  {
    id: 'defesa_auto',
    titulo: 'Defesa de Auto de Infração / Imposição de Penalidade',
    grupo: 'Contencioso & Fiscalização',
    setorPadrao: 'GERAL',
    motivacao: 'DEFESA DE AUTO DE INFRAÇÃO',
    prazoInfo: 'Prazo legal de defesa conforme auto lavrado',
    resumo: 'Apresentação de defesa prévia, impugnação ou recurso com juntada de comprovantes.',
  },
  {
    id: 'prorrogacao_prazo',
    titulo: 'Auto de Intimação (Prorrogação de Prazo)',
    grupo: 'Contencioso & Fiscalização',
    setorPadrao: 'GERAL',
    motivacao: 'PRORROGAÇÃO DE PRAZO',
    prazoInfo: 'Avaliação pelo fiscal titular',
    resumo: 'Pedido formal de dilação de prazo para cumprimento das exigências sanitárias.',
  },
  {
    id: 'desinterdicao',
    titulo: 'Desinterdição de Estabelecimento',
    grupo: 'Contencioso & Fiscalização',
    setorPadrao: 'GERAL',
    motivacao: 'DESINTERDIÇÃO',
    prazoInfo: 'Vistoria prioritária após regularização',
    resumo: 'Requerimento de revogação de termo de interdição cautelar ou definitiva após adequação total.',
  },
  {
    id: 'habite_se',
    titulo: 'Habite-se Sanitário (LC 40/2019)',
    grupo: 'Obras & Edificações',
    setorPadrao: 'HABITE-SE SANITÁRIO',
    motivacao: 'HABITE-SE SANITÁRIO',
    prazoInfo: 'Vistoria hidrossanitária em até 5 dias úteis',
    resumo: 'Vistoria sanitária de conclusão de obra com dados de edificação, DIC e RT.',
  },
  {
    id: 'livro_saude',
    titulo: 'Livro de Unidade de Saúde (Abertura / Autenticação)',
    grupo: 'Livros & Responsabilidade',
    setorPadrao: 'SAÚDE',
    motivacao: 'LIVRO DE UNIDADE DE SAÚDE',
    prazoInfo: 'Conferência documental em 3 dias úteis',
    resumo: 'Abertura, autenticação ou encerramento de livros oficiais de estabelecimentos de saúde.',
  },
  {
    id: 'livro_piscina',
    titulo: 'Livro Piscina (Autenticação / Controle)',
    grupo: 'Livros & Responsabilidade',
    setorPadrao: 'SANEAMENTO & AMBIENTAL',
    motivacao: 'LIVRO PISCINA',
    prazoInfo: 'Conferência documental em 3 dias úteis',
    resumo: 'Autenticação de livro de controle físico-químico e bacteriológico de piscinas de uso coletivo.',
  },
  {
    id: 'responsabilidade_tecnica',
    titulo: 'Responsabilidade Técnica (TRT)',
    grupo: 'Livros & Responsabilidade',
    setorPadrao: 'SAÚDE',
    motivacao: 'RESPONSABILIDADE TÉCNICA',
    prazoInfo: 'Análise em 3 dias úteis',
    resumo: 'Assunção, alteração ou baixa de Termo de Responsabilidade Técnica perante a VISA.',
  },
  {
    id: 'parecer_tecnico',
    titulo: 'Parecer Técnico / Análise de Projeto Sanitário',
    grupo: 'Obras & Edificações',
    setorPadrao: 'SAÚDE',
    motivacao: 'PARECER TÉCNICO',
    prazoInfo: 'Análise técnica conforme complexidade',
    resumo: 'Solicitação de análise prévia de projeto arquitetônico ou parecer técnico sanitário.',
  },
  {
    id: 'laudo_potabilidade',
    titulo: 'Laudo de Análise de Potabilidade da Água',
    grupo: 'Laboratório',
    setorPadrao: 'SANEAMENTO & AMBIENTAL',
    motivacao: 'LAUDO DE POTABILIDADE',
    prazoInfo: 'Encaminhado ao Laboratório Municipal VISA',
    resumo: 'Solicitação de coleta e análise bacteriológica/físico-química de poços, reservatórios ou rede.',
  },
  {
    id: 'feirante_ambulante',
    titulo: 'Autorização / Renovação Ambulante ou Feirante',
    grupo: 'Feiras & Eventos',
    setorPadrao: 'EVENTOS & FEIRAS',
    motivacao: 'FEIRANTE / AMBULANTE',
    prazoInfo: 'Liberação conforme escala do evento/feira',
    resumo: 'Licenciamento ou renovação sanitária para box de feira livre, food truck ou ponto fixo.',
  },
  {
    id: 'denuncia_sanitaria',
    titulo: 'Denúncia Sanitária / Ouvidoria',
    grupo: 'Ouvidoria',
    setorPadrao: 'OUVIDORIA & DENÚNCIAS',
    motivacao: 'DENÚNCIA',
    prazoInfo: 'Triagem sanitária em até 24h',
    resumo: 'Comunicação de irregularidade sanitária para averiguação fiscal (com opção de sigilo).',
  },
];

interface SinncDemoWorkflowModalsProps {
  modalKind: SinncWorkflowModalKind;
  initialPasta?: PastaVisaItem | null;
  initialServicoId?: string | null;
  currentUser: UserProfile | null;
  externalScope?: ExternalUserScope;
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
  initialServicoId,
  currentUser,
  externalScope,
  users,
  onClose,
  onSaveProcesso,
  onSaveFiscalizacao,
  onSaveEscalaItem,
  onSaveFeirante,
  onCreatedPasta,
}) => {
  const isExternal = Boolean(externalScope?.isExternal);
  const isSingleDocExternal = externalScope?.mode === 'CIDADAO' || externalScope?.mode === 'CONTRIBUINTE';
  const lockedExternalDoc = isSingleDocExternal && externalScope?.primaryDoc ? formatDoc(externalScope.primaryDoc) : '';
  const [origem, setOrigem] = useState<'PORTAL_MUNICIPE' | 'PORTAL_CONTADOR' | 'DENUNCIA_ANONIMA' | 'RECEPCAO_VISA'>(
    externalScope?.mode === 'CONTABILIDADE' ? 'PORTAL_CONTADOR' : 'PORTAL_MUNICIPE'
  );
  const [servicoId, setServicoId] = useState<string>(initialServicoId || 'alvara_inicial');
  const [doc, setDoc] = useState(initialPasta?.cnpj_cpf || lockedExternalDoc || '');
  const [pastaFisicaOpcional, setPastaFisicaOpcional] = useState('');
  const [razao, setRazao] = useState(initialPasta?.razao_social || '');
  const [assunto, setAssunto] = useState('Solicitação de Alvará Sanitário Inicial');
  const [setor, setSetor] = useState<SetorDemanda>('ALIMENTOS');
  const [bairro, setBairro] = useState(initialPasta?.bairro || 'Centro');
  const [endereco, setEndereco] = useState(initialPasta?.endereco || '');
  const [telefoneContato, setTelefoneContato] = useState(initialPasta?.telefone || currentUser?.telefone || '');
  const [emailContato, setEmailContato] = useState(initialPasta?.email || currentUser?.email || '');
  const [observacoes, setObservacoes] = useState('');
  const [loadingRf, setLoadingRf] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos complementares por tipo de serviço
  const [cnaeAtividade, setCnaeAtividade] = useState(initialPasta?.cnae_principal || '');
  const [numAlvaraAnterior, setNumAlvaraAnterior] = useState('');
  const [numAutoOuTermo, setNumAutoOuTermo] = useState('');
  const [numProcessoRef, setNumProcessoRef] = useState('');
  const [tipoLivroAcao, setTipoLivroAcao] = useState<'ABERTURA' | 'AUTENTICAÇÃO' | 'ENCERRAMENTO'>('ABERTURA');
  const [numLivroOrdem, setNumLivroOrdem] = useState('');
  const [conselhoRt, setConselhoRt] = useState('');
  const [pontoColetaAgua, setPontoColetaAgua] = useState('Reservatório / Caixa d’água principal');
  const [anexosNomes, setAnexosNomes] = useState<string[]>([]);

  // Vistoria & Auto-Agenda state
  const [tipoVistoria, setTipoVistoria] = useState<FiscalizacaoItem['tipoVistoria']>('ROTINA');
  const [medida, setMedida] = useState('Termo de Intimação (Prazo de Adequação)');
  const [statusFisc, setStatusFisc] = useState<FiscalizacaoItem['status']>('NOTIFICADO');
  const [prazoDias, setPrazoDias] = useState<number>(15);
  const [vincularProcessoId] = useState('');

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

  const selectedServico = SINNC_SERVICOS_CATALOG.find((s) => s.id === servicoId) || SINNC_SERVICOS_CATALOG[0];

  const contabClientOptions: ContabilidadeClienteOption[] = useMemo(() => {
    if (externalScope?.contabilidadeClientes && externalScope.contabilidadeClientes.length > 0) {
      return externalScope.contabilidadeClientes;
    }
    const linked = externalScope?.contabilidade?.cnpjs_vinculados || [];
    if (linked.length === 0) return [];
    const allPastas = loadAllPastasUnificadas();
    const localContrib = safeReadLocalArray<ContribuinteProfile>('visa_contribuintes');
    const contribList = localContrib.length > 0 ? localContrib : INITIAL_CONTRIBUINTES;
    return linked.map((raw) => {
      const limpo = cleanDoc(raw);
      const pasta = allPastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo);
      const contrib = contribList.find((c) => cleanDoc(c.cnpj_cpf) === limpo);
      return {
        docLimpo: limpo,
        docFormatado: pasta?.cnpj_cpf || contrib?.cnpj_cpf || formatDoc(limpo) || raw,
        razaoSocial: pasta?.razao_social || contrib?.razao_social || 'Empresa da Carteira',
        endereco: pasta?.endereco || contrib?.endereco || '',
        bairro: pasta?.bairro || contrib?.bairro || 'Centro',
        telefone: pasta?.telefone || contrib?.telefone || '',
        email: pasta?.email || contrib?.email || '',
        cnae: pasta?.cnae_principal || contrib?.cnae_principal || '',
      };
    });
  }, [externalScope?.contabilidadeClientes, externalScope?.contabilidade?.cnpjs_vinculados]);

  const applyClientByDoc = (rawDoc: string, pastaOverride?: PastaVisaItem | null) => {
    const limpo = cleanDoc(rawDoc);
    if (!limpo) {
      setDoc('');
      setRazao('');
      setBairro('Centro');
      setEndereco('');
      setTelefoneContato('');
      setEmailContato('');
      setCnaeAtividade('');
      return;
    }

    const allPastas = loadAllPastasUnificadas();
    const pastaMatch =
      pastaOverride || allPastas.find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) || null;
    const optionMatch = contabClientOptions.find((c) => c.docLimpo === limpo) || null;

    const localContrib = safeReadLocalArray<ContribuinteProfile>('visa_contribuintes');
    const contribList = localContrib.length > 0 ? localContrib : INITIAL_CONTRIBUINTES;
    const contribMatch = contribList.find((c) => cleanDoc(c.cnpj_cpf) === limpo) || null;

    const localCid = safeReadLocalArray<CidadaoProfile>('visa_cidadaos');
    const cidList = localCid.length > 0 ? localCid : INITIAL_CIDADAOS;
    const cidMatch = cidList.find((c) => cleanDoc(c.cpf) === limpo) || null;

    const formatted =
      pastaMatch?.cnpj_cpf ||
      contribMatch?.cnpj_cpf ||
      cidMatch?.cpf ||
      optionMatch?.docFormatado ||
      formatDoc(limpo) ||
      rawDoc;

    const resolvedRazao =
      pastaMatch?.razao_social ||
      contribMatch?.razao_social ||
      cidMatch?.nome_completo ||
      (optionMatch && optionMatch.razaoSocial !== 'Empresa da Carteira' ? optionMatch.razaoSocial : '') ||
      '';
    const resolvedEndereco =
      pastaMatch?.endereco || contribMatch?.endereco || cidMatch?.endereco || optionMatch?.endereco || '';
    const resolvedBairro =
      pastaMatch?.bairro || contribMatch?.bairro || cidMatch?.bairro || optionMatch?.bairro || 'Centro';
    const resolvedTelefone =
      pastaMatch?.telefone || contribMatch?.telefone || cidMatch?.telefone || optionMatch?.telefone || '';
    const resolvedEmail =
      pastaMatch?.email || contribMatch?.email || cidMatch?.email || optionMatch?.email || '';
    const resolvedCnae =
      pastaMatch?.cnae_principal || contribMatch?.cnae_principal || optionMatch?.cnae || '';

    setDoc(formatted);
    setRazao(resolvedRazao);
    setBairro(resolvedBairro);
    setEndereco(resolvedEndereco);
    setTelefoneContato(resolvedTelefone);
    setEmailContato(resolvedEmail);
    setCnaeAtividade(resolvedCnae);

    if (limpo.length === 14 && (!resolvedRazao || !resolvedEndereco)) {
      setLoadingRf(true);
      fetchCnpj(limpo)
        .then((rf) => {
          if (rf) {
            setRazao((prev) => prev || rf.razao || '');
            setEndereco((prev) =>
              prev || `${rf.rua_api || ''} ${rf.num_api ? `, ${rf.num_api}` : ''}`.trim()
            );
            setBairro((prev) => (prev && prev !== 'Centro' ? prev : rf.bairro || prev || 'Centro'));
            if (rf.telefone) setTelefoneContato((prev) => prev || rf.telefone || '');
            if (rf.email) setEmailContato((prev) => prev || rf.email || '');
            if (rf.cnaes?.[0] || rf.cnae) {
              setCnaeAtividade((prev) => prev || rf.cnaes?.[0] || rf.cnae || '');
            }
          }
        })
        .catch(() => {
          // ignore RFB lookup errors
        })
        .finally(() => {
          setLoadingRf(false);
        });
    }
  };

  const handleSelectServicoId = (nextId: string) => {
    setServicoId(nextId);
    const found = SINNC_SERVICOS_CATALOG.find((s) => s.id === nextId);
    if (found) {
      setAssunto(found.titulo);
      setSetor(found.setorPadrao);
      if (nextId === 'denuncia_sanitaria') {
        setOrigem('DENUNCIA_ANONIMA');
        if (isSingleDocExternal) {
          setDoc('');
          setRazao('');
          setEndereco('');
          setBairro('Centro');
          setCnaeAtividade('');
        }
      } else {
        if (externalScope?.mode === 'CONTABILIDADE') {
          setOrigem('PORTAL_CONTADOR');
        } else if (isSingleDocExternal) {
          setOrigem('PORTAL_MUNICIPE');
          if (!doc && (lockedExternalDoc || externalScope?.prefillProfile?.doc)) {
            const p = externalScope?.prefillProfile;
            const docPref = lockedExternalDoc || formatDoc(cleanDoc(p?.doc)) || '';
            setDoc(docPref);
            setRazao(initialPasta?.razao_social || p?.razaoSocial || currentUser?.nome_completo || '');
            setBairro(initialPasta?.bairro || p?.bairro || currentUser?.bairro || 'Centro');
            setEndereco(initialPasta?.endereco || p?.endereco || currentUser?.endereco || '');
            setTelefoneContato(initialPasta?.telefone || p?.telefone || currentUser?.telefone || '');
            setEmailContato(initialPasta?.email || p?.email || currentUser?.email || '');
            setCnaeAtividade(initialPasta?.cnae_principal || p?.cnae || '');
          }
        } else if (origem === 'DENUNCIA_ANONIMA') {
          setOrigem('RECEPCAO_VISA');
        }
      }
    }
  };

  useEffect(() => {
    if (!modalKind) return;
    if (externalScope?.mode === 'CONTABILIDADE') {
      setOrigem('PORTAL_CONTADOR');
    } else if (isSingleDocExternal) {
      setOrigem('PORTAL_MUNICIPE');
    } else {
      setOrigem('RECEPCAO_VISA');
    }
    const targetServId = initialServicoId || 'alvara_inicial';
    const foundServ = SINNC_SERVICOS_CATALOG.find((s) => s.id === targetServId) || SINNC_SERVICOS_CATALOG[0];
    setServicoId(foundServ.id);
    setAssunto(foundServ.titulo);
    setSetor(foundServ.setorPadrao);
    if (foundServ.id === 'denuncia_sanitaria') {
      setOrigem('DENUNCIA_ANONIMA');
    }

    if (isSingleDocExternal) {
      if (foundServ.id === 'denuncia_sanitaria') {
        setDoc('');
        setRazao('');
        setBairro('Centro');
        setEndereco('');
        setTelefoneContato(externalScope?.prefillProfile?.telefone || currentUser?.telefone || '');
        setEmailContato(externalScope?.prefillProfile?.email || currentUser?.email || '');
        setCnaeAtividade('');
      } else {
        const prefill = externalScope?.prefillProfile;
        const resolvedDoc =
          lockedExternalDoc ||
          (prefill?.doc ? formatDoc(cleanDoc(prefill.doc)) : '') ||
          initialPasta?.cnpj_cpf ||
          '';
        const docDigits = cleanDoc(resolvedDoc);
        const pastaMatch =
          initialPasta ||
          (docDigits
            ? loadAllPastasUnificadas().find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === docDigits) || null
            : null);
        setDoc(resolvedDoc);
        setRazao(
          initialPasta?.razao_social ||
            pastaMatch?.razao_social ||
            prefill?.razaoSocial ||
            currentUser?.nome_completo ||
            ''
        );
        setBairro(
          initialPasta?.bairro || pastaMatch?.bairro || prefill?.bairro || currentUser?.bairro || 'Centro'
        );
        setEndereco(
          initialPasta?.endereco || pastaMatch?.endereco || prefill?.endereco || currentUser?.endereco || ''
        );
        setTelefoneContato(
          initialPasta?.telefone || pastaMatch?.telefone || prefill?.telefone || currentUser?.telefone || ''
        );
        setEmailContato(
          initialPasta?.email || pastaMatch?.email || prefill?.email || currentUser?.email || ''
        );
        setCnaeAtividade(initialPasta?.cnae_principal || pastaMatch?.cnae_principal || prefill?.cnae || '');
      }
    } else if (externalScope?.mode === 'CONTABILIDADE') {
      if (initialPasta) {
        applyClientByDoc(initialPasta.cnpj_cpf || initialPasta.cpf_cnpj_limpo || '', initialPasta);
      } else if (contabClientOptions.length === 1) {
        applyClientByDoc(contabClientOptions[0].docFormatado);
      } else {
        setDoc('');
        setRazao('');
        setBairro('Centro');
        setEndereco('');
        setTelefoneContato('');
        setEmailContato('');
        setCnaeAtividade('');
      }
    } else {
      setDoc(initialPasta?.cnpj_cpf || '');
      setRazao(initialPasta?.razao_social || '');
      setBairro(initialPasta?.bairro || currentUser?.bairro || 'Centro');
      setEndereco(initialPasta?.endereco || currentUser?.endereco || '');
      setTelefoneContato(initialPasta?.telefone || currentUser?.telefone || '');
      setEmailContato(initialPasta?.email || currentUser?.email || '');
      setCnaeAtividade(initialPasta?.cnae_principal || '');
    }

    setObservacoes('');
    setNumAlvaraAnterior('');
    setNumAutoOuTermo('');
    setNumProcessoRef('');
    setNumLivroOrdem('');
    setConselhoRt('');
    setAnexosNomes([]);
    setPastaFisicaOpcional('');
  }, [
    modalKind,
    initialPasta,
    initialServicoId,
    externalScope?.mode,
    externalScope?.primaryDoc,
    externalScope?.prefillProfile,
    contabClientOptions,
    lockedExternalDoc,
    isSingleDocExternal,
    currentUser?.nome_completo,
    currentUser?.bairro,
    currentUser?.endereco,
    currentUser?.telefone,
    currentUser?.email,
  ]);

  if (!modalKind) return null;

  const autoLinkCnpjToContabilidade = async (docLimpo: string) => {
    if (externalScope?.mode !== 'CONTABILIDADE' || !externalScope.contabilidade || !isValidDocLength(docLimpo)) return;
    const formatted = formatDoc(docLimpo);
    const currentLinks = externalScope.contabilidade.cnpjs_vinculados || [];
    if (currentLinks.some((d) => cleanDoc(d) === docLimpo)) return;
    try {
      const raw = localStorage.getItem('visa_contabilidades_lab');
      const list: ContabilidadeProfile[] = raw ? JSON.parse(raw) : [];
      const updatedContab: ContabilidadeProfile = {
        ...externalScope.contabilidade,
        cnpjs_vinculados: [formatted, ...currentLinks],
      };
      const nextList = list.some((c) => c.id === updatedContab.id)
        ? list.map((c) => (c.id === updatedContab.id ? updatedContab : c))
        : [updatedContab, ...list];
      localStorage.setItem('visa_contabilidades_lab', JSON.stringify(nextList));
      await saveContabilidadeToSupabase(updatedContab);
      window.dispatchEvent(new Event('visa_contabilidades_updated'));
    } catch {
      // ignore local update errors
    }
  };

  const fiscaisLista = users.filter((u) => !u.tipo_usuario || u.tipo_usuario === 'SERVIDOR');

  const docLimpoAtual = cleanDoc(doc);
  const pastaExistenteAtual =
    docLimpoAtual.length >= 11
      ? loadAllPastasUnificadas().find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === docLimpoAtual) || null
      : null;

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
        if (rf.telefone) setTelefoneContato(rf.telefone);
        if (rf.email) setEmailContato(rf.email);
        if (rf.cnaes?.[0] || rf.cnae) setCnaeAtividade(rf.cnaes?.[0] || rf.cnae || '');
      }
    } finally {
      setLoadingRf(false);
    }
  };

  const handleAnexarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const nomes = Array.from(files).map((f) => f.name);
    setAnexosNomes((prev) => [...prev, ...nomes]);
    e.target.value = '';
  };

  const handleSubmitNovaDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isAnonima = (origem === 'DENUNCIA_ANONIMA' || servicoId === 'denuncia_sanitaria') && !isValidDocLength(doc);
      let pastaResolvida: PastaVisaItem | null = null;
      let numPasta = '';
      const limpo = cleanDoc(doc);

      if (!isAnonima && isValidDocLength(limpo)) {
        if (isExternal) {
          // Somente servidores podem criar Pasta VISA; usuários externos apenas vinculam se já existir
          const existing = loadAllPastasUnificadas().find(
            (p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo
          );
          if (existing) {
            pastaResolvida = existing;
            numPasta = getDisplayPastaNumero(existing);
          }
        } else {
          const res = await obterOuCriarPastaPorCpfCnpj(limpo, {
            razao_social: razao,
            setor,
            bairro,
            endereco,
            telefone: telefoneContato,
            email: emailContato,
            cnae_principal: cnaeAtividade,
            pasta_fisica_informada: pastaFisicaOpcional || undefined,
            criado_por: currentUser?.nome_completo || 'Capa Teste Full',
          });
          pastaResolvida = res.pasta;
          numPasta = getDisplayPastaNumero(res.pasta);
          if (onCreatedPasta) onCreatedPasta(res.pasta);
        }
      }

      const now = new Date();
      const prot =
        servicoId === 'habite_se'
          ? `HAB-${now.getFullYear()}/${String(Math.floor(100 + Math.random() * 899))}`
          : `${now.getFullYear()}-${String(Math.floor(10000 + Math.random() * 89999))}`;
      const prazoDate = new Date(now);
      prazoDate.setDate(prazoDate.getDate() + 10);
      const procId = servicoId === 'habite_se' ? `proc-hab-${Date.now()}` : `proc-${Date.now()}`;

      const extras: string[] = [];
      if (selectedServico) extras.push(`Serviço: ${selectedServico.titulo}`);
      if (cnaeAtividade.trim()) extras.push(`Atividade/CNAE: ${cnaeAtividade.trim()}`);
      if (numAlvaraAnterior.trim()) extras.push(`Alvará anterior: ${numAlvaraAnterior.trim()}`);
      if (numAutoOuTermo.trim()) extras.push(`Auto/Termo ref.: ${numAutoOuTermo.trim()}`);
      if (numProcessoRef.trim()) extras.push(`Processo origem: ${numProcessoRef.trim()}`);
      if (servicoId === 'habite_se') {
        if (nomeEdificacao.trim()) extras.push(`Edificação: ${nomeEdificacao.trim()} (${tipoPeticao})`);
        if (numeroDic.trim()) extras.push(`DIC: ${numeroDic.trim()}`);
        if (areaM2.trim()) extras.push(`Área: ${areaM2.trim()} m²`);
        if (rtNome.trim() || rtRegistro.trim()) extras.push(`RT: ${rtNome.trim()} (${rtRegistro.trim()})`);
      }
      if (servicoId === 'livro_saude' || servicoId === 'livro_piscina') {
        extras.push(`Livro: ${tipoLivroAcao}${numLivroOrdem.trim() ? ` · Nº ${numLivroOrdem.trim()}` : ''}`);
        if (rtNome.trim() || conselhoRt.trim()) extras.push(`RT: ${rtNome.trim()} ${conselhoRt.trim()}`);
      }
      if (servicoId === 'responsabilidade_tecnica' || servicoId === 'parecer_tecnico') {
        if (rtNome.trim() || conselhoRt.trim()) extras.push(`RT/Conselho: ${rtNome.trim()} ${conselhoRt.trim()}`);
      }
      if (servicoId === 'laudo_potabilidade' && pontoColetaAgua.trim()) {
        extras.push(`Ponto de coleta: ${pontoColetaAgua.trim()}`);
      }
      if (servicoId === 'feirante_ambulante') {
        extras.push(`Feira/Evento: ${feiraNome} · Box: ${codigoBox} · Produtos: ${produtosFeira}`);
      }
      if (anexosNomes.length > 0) {
        extras.push(`Anexos: ${anexosNomes.join(', ')}`);
      }
      if (observacoes.trim()) {
        extras.push(`Observações: ${observacoes.trim()}`);
      }

      const resumoCompleto = extras.join(' · ');

      if (servicoId === 'habite_se' && isValidDocLength(limpo)) {
        const habite: HabiteSeRegistroItem = {
          id: `hab-${Date.now()}`,
          numero_protocolo: prot,
          numero_pasta: numPasta,
          cpf_cnpj_limpo: limpo,
          cnpj_cpf: formatDoc(limpo),
          titular_nome: pastaResolvida?.razao_social || razao || 'Requerente',
          nome_edificacao: nomeEdificacao || pastaResolvida?.razao_social || razao || 'Edificação',
          tipo_peticao: tipoPeticao,
          endereco: endereco || pastaResolvida?.endereco || 'Balneário Camboriú',
          bairro,
          numero_dic: numeroDic,
          rt_nome: rtNome,
          rt_registro: rtRegistro,
          area_total_m2: areaM2,
          fiscal_responsavel: 'Aguardando Diretoria',
          status: 'EM ANÁLISE',
          processo_id: procId,
          observacoes: resumoCompleto,
          criado_em: now.toISOString(),
        };
        await saveHabiteSeRegistro(habite);
      }

      const assuntoFinal =
        servicoId === 'denuncia_sanitaria' || origem === 'DENUNCIA_ANONIMA'
          ? assunto.toUpperCase().includes('DENÚNCIA')
            ? assunto
            : `Denúncia Sanitária — ${assunto}`
          : servicoId === 'habite_se'
          ? `Habite-se Sanitário (${tipoPeticao})${numeroDic ? ` · DIC ${numeroDic}` : ''}`
          : assunto || selectedServico.titulo;

      const obsPadrao = numPasta
        ? `Protocolo vinculado à Pasta VISA ${numPasta}.`
        : isExternal
        ? 'Solicitação recebida via Portal Externo — aguardando abertura de Pasta VISA por servidor.'
        : 'Protocolo em triagem sem CPF/CNPJ inicial.';

      const novoProc: ProcessoItem = {
        id: procId,
        num_processo: prot,
        prot_1doc: prot,
        data_protocolo: now.toISOString().slice(0, 10),
        data_entrada: now.toISOString().slice(0, 10),
        prazo_vistoria: prazoDate.toISOString().slice(0, 10),
        cnpj_cpf: isAnonima ? '' : formatDoc(limpo || doc),
        cpf_cnpj_limpo: isAnonima ? undefined : limpo,
        pasta: numPasta,
        numero_pasta: numPasta,
        razao_social:
          pastaResolvida?.razao_social ||
          razao ||
          (isAnonima ? 'DENÚNCIA ANÔNIMA (AGUARDANDO VINCULAÇÃO)' : 'REQUERENTE'),
        nome_fantasia: pastaResolvida?.razao_social || razao || 'Estabelecimento',
        assunto: assuntoFinal,
        tipo_servico: selectedServico.titulo,
        setor: origem === 'DENUNCIA_ANONIMA' ? 'OUVIDORIA & DENÚNCIAS' : setor,
        motivacao: selectedServico.motivacao || (origem === 'DENUNCIA_ANONIMA' ? 'DENÚNCIA' : origem),
        origem_solicitacao: origem,
        bairro,
        endereco: endereco || pastaResolvida?.endereco || 'Balneário Camboriú',
        telefone: telefoneContato || pastaResolvida?.telefone,
        email: emailContato || pastaResolvida?.email,
        solicitante_nome: currentUser?.nome_completo || razao,
        solicitante_contato: emailContato || telefoneContato || currentUser?.email,
        fiscal_responsavel: 'Aguardando Diretoria',
        status: 'EM ANÁLISE',
        grau_risco: (pastaResolvida?.grau_risco as any) || 'MÉDIO RISCO',
        observacoes: resumoCompleto || obsPadrao,
        tramitacoes: [
          {
            id: `tram-init-${Date.now()}`,
            data_hora: now.toISOString(),
            tipo: 'PROTOCOLO_CRIADO',
            titulo: numPasta
              ? `Solicitação aberta na Pasta VISA ${numPasta}`
              : isExternal
              ? 'Solicitação enviada (aguardando abertura de Pasta VISA por servidor)'
              : 'Demanda aberta em triagem (sem CPF/CNPJ)',
            descricao: resumoCompleto || assuntoFinal,
            responsavel_nome: currentUser?.nome_completo || 'Portal Digital VISA',
            anexo_nome: anexosNomes.length > 0 ? anexosNomes.join(', ') : undefined,
            status_processo_momento: 'EM ANÁLISE',
          },
        ],
      };

      await onSaveProcesso(novoProc);
      if (limpo) {
        await autoLinkCnpjToContabilidade(limpo);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitNovaVistoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExternal) return;
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
      let pastaResolvida: PastaVisaItem | null = null;
      if (isExternal) {
        pastaResolvida =
          loadAllPastasUnificadas().find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) || null;
      } else {
        const { pasta } = await obterOuCriarPastaPorCpfCnpj(limpo, {
          razao_social: razao,
          setor: 'HABITE-SE SANITÁRIO',
          bairro,
          endereco,
          criado_por: currentUser?.nome_completo || 'Habite-se VISA',
        });
        pastaResolvida = pasta;
        if (onCreatedPasta) onCreatedPasta(pasta);
      }

      const numPasta = pastaResolvida ? getDisplayPastaNumero(pastaResolvida) : '';
      const now = new Date();
      const numProt = `HAB-${now.getFullYear()}/${String(Math.floor(100 + Math.random() * 899))}`;
      const procId = `proc-hab-${Date.now()}`;

      const habite: HabiteSeRegistroItem = {
        id: `hab-${Date.now()}`,
        numero_protocolo: numProt,
        numero_pasta: numPasta,
        cpf_cnpj_limpo: limpo,
        cnpj_cpf: formatDoc(limpo),
        titular_nome: pastaResolvida?.razao_social || razao,
        nome_edificacao: nomeEdificacao || pastaResolvida?.razao_social || razao,
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
        razao_social: pastaResolvida?.razao_social || razao,
        nome_fantasia: nomeEdificacao || pastaResolvida?.razao_social || razao,
        assunto: `Habite-se Sanitário (${tipoPeticao}) · DIC ${numeroDic || 'S/N'}`,
        tipo_servico: 'Habite-se Sanitário',
        setor: 'HABITE-SE SANITÁRIO',
        origem_solicitacao: origem,
        bairro,
        endereco,
        fiscal_responsavel: 'Aguardando Diretoria',
        status: 'EM ANÁLISE',
        observacoes: `Edificação: ${nomeEdificacao} · RT: ${rtNome} (${rtRegistro}) · Área: ${areaM2 || '—'} m²`,
      };
      await onSaveProcesso(procHabite);
      await autoLinkCnpjToContabilidade(limpo);
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
      let pastaResolvida: PastaVisaItem | null = null;
      if (isExternal) {
        pastaResolvida =
          loadAllPastasUnificadas().find((p) => cleanDoc(p.cpf_cnpj_limpo || p.cnpj_cpf) === limpo) || null;
      } else {
        const { pasta } = await obterOuCriarPastaPorCpfCnpj(limpo, {
          razao_social: razao,
          setor: 'EVENTOS & FEIRAS',
          bairro,
          endereco,
          criado_por: currentUser?.nome_completo || 'Feiras VISA',
        });
        pastaResolvida = pasta;
        if (onCreatedPasta) onCreatedPasta(pasta);
      }

      const numPasta = pastaResolvida ? getDisplayPastaNumero(pastaResolvida) : '';
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
        nome_pf: razao || pastaResolvida?.razao_social || '',
        razao: pastaResolvida?.razao_social || razao,
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
      await autoLinkCnpjToContabilidade(limpo);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const titles: Record<Exclude<SinncWorkflowModalKind, null>, string> = {
    nova_demanda: isExternal
      ? 'Nova Solicitação de Serviço Sanitário'
      : 'Nova Demanda / Protocolo Digital (Auto-Pasta Híbrida)',
    nova_vistoria: 'Registrar Vistoria / Notificação (Com Lembrete na Agenda)',
    novo_habite_se: 'Novo Requerimento de Habite-se Sanitário (LC 40/2019)',
    novo_feirante: isExternal ? 'Solicitação de Feirante / Ambulante' : 'Vincular Feirante / Box à Pasta VISA',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4 text-left" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{titles[modalKind]}</h3>
            {modalKind === 'nova_demanda' && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Selecione o serviço sanitário desejado e preencha as informações correspondentes
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {modalKind === 'nova_demanda' && (
            <form onSubmit={handleSubmitNovaDemanda} className="p-5 space-y-3.5 text-xs">
              {/* Serviço Solicitado */}
              <div className="bg-[#f4f8fc] border border-[#cfe0ee] rounded-md p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-[#285277]">
                    Tipo de Serviço / Solicitação *
                  </label>
                  <span className="text-[10.5px] text-slate-500">{selectedServico.prazoInfo}</span>
                </div>
                <select
                  value={servicoId}
                  onChange={(e) => handleSelectServicoId(e.target.value)}
                  className="w-full !text-xs !py-2 !px-2.5 bg-white font-medium text-slate-900"
                >
                  {SINNC_SERVICOS_CATALOG.map((serv) => (
                    <option key={serv.id} value={serv.id}>
                      {serv.titulo} ({serv.grupo})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-600 leading-snug">{selectedServico.resumo}</p>
              </div>

              {!isExternal && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Canal de Entrada</label>
                    <select value={origem} onChange={(e) => setOrigem(e.target.value as any)} className="w-full !text-xs !py-2 !px-2.5">
                      <option value="PORTAL_MUNICIPE">Portal do Cidadão / Contribuinte</option>
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
                      <option value="SANEAMENTO & AMBIENTAL">Saneamento, Água & Ambiental</option>
                      <option value="HABITE-SE SANITÁRIO">Habite-se Sanitário</option>
                      <option value="EVENTOS & FEIRAS">Feiras & Ambulantes</option>
                      <option value="OUVIDORIA & DENÚNCIAS">Ouvidoria & Denúncias</option>
                      <option value="GERAL">Atividades Gerais</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className={isExternal ? 'sm:col-span-12' : 'sm:col-span-6'}>
                  {externalScope?.mode === 'CONTABILIDADE' && (
                    <div className="mb-2.5 p-2.5 rounded-md bg-slate-50 border border-slate-200/90">
                      <label className="block text-[11px] font-semibold text-[#285277] mb-1">
                        Selecionar CNPJ do Quadro de Clientes ({contabClientOptions.length})
                      </label>
                      {contabClientOptions.length > 0 ? (
                        <select
                          value={contabClientOptions.find((c) => c.docLimpo === cleanDoc(doc))?.docFormatado || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              applyClientByDoc(e.target.value);
                            }
                          }}
                          className="w-full !text-xs !py-2 !px-2.5 bg-white font-medium text-slate-900"
                        >
                          <option value="">Escolha uma empresa da sua carteira ou informe outro CNPJ abaixo...</option>
                          {contabClientOptions.map((c) => (
                            <option key={c.docLimpo} value={c.docFormatado}>
                              {c.docFormatado} — {c.razaoSocial}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Nenhuma empresa vinculada ainda. Informe o CNPJ abaixo para vincular automaticamente à sua carteira.
                        </p>
                      )}
                    </div>
                  )}

                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    CPF ou CNPJ {origem === 'DENUNCIA_ANONIMA' ? '(opcional se anônima)' : '*'}
                    {isSingleDocExternal && origem !== 'DENUNCIA_ANONIMA' ? ' (vinculado ao seu acesso)' : ''}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={doc}
                      readOnly={Boolean(isSingleDocExternal && lockedExternalDoc && origem !== 'DENUNCIA_ANONIMA')}
                      onChange={(e) => setDoc(e.target.value)}
                      placeholder="Somente dígitos ou formatado"
                      className={`w-full !text-xs !py-2 !px-2.5 font-mono ${
                        isSingleDocExternal && lockedExternalDoc && origem !== 'DENUNCIA_ANONIMA' ? 'bg-slate-100 text-slate-600' : ''
                      }`}
                      required={origem !== 'DENUNCIA_ANONIMA'}
                    />
                    <button
                      type="button"
                      onClick={handleConsultarCnpj}
                      disabled={loadingRf || cleanDoc(doc).length !== 14}
                      className="px-2.5 py-2 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0 flex items-center gap-1"
                      title="Consultar Receita Federal"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {loadingRf && <span className="text-[10.5px]">RFB...</span>}
                    </button>
                  </div>
                </div>

                {!isExternal && (
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
                )}
              </div>

              {isExternal && docLimpoAtual.length >= 11 && (
                <div className="px-3 py-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-[#3b6d96] shrink-0" />
                  {pastaExistenteAtual ? (
                    <span>
                      Pasta VISA já existente localizada:{' '}
                      <strong className="font-mono text-[#285277]">{getDisplayPastaNumero(pastaExistenteAtual)}</strong>
                    </span>
                  ) : (
                    <span>
                      A abertura de novas Pastas VISA é exclusiva dos servidores da Vigilância Sanitária. Seu protocolo seguirá em triagem.
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Razão Social / Nome *</label>
                  <input
                    type="text"
                    value={razao}
                    onChange={(e) => setRazao(e.target.value)}
                    placeholder="Nome completo ou Razão Social"
                    required={origem !== 'DENUNCIA_ANONIMA'}
                    className="w-full !text-xs !py-2 !px-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Bairro *</label>
                  <select value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full !text-xs !py-2 !px-2.5">
                    {BAIRROS_BC.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Endereço / Número / Complemento</label>
                  <input
                    type="text"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua / Avenida, número e sala"
                    className="w-full !text-xs !py-2 !px-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={telefoneContato}
                    onChange={(e) => setTelefoneContato(e.target.value)}
                    placeholder="(47) 99999-9999"
                    className="w-full !text-xs !py-2 !px-2.5"
                  />
                </div>
              </div>

              {/* Campos específicos contextuais conforme o serviço escolhido */}
              {(servicoId === 'alvara_inicial' || servicoId === 'renovacao_alvara') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">CNAE / Ramo de Atividade</label>
                    <input
                      type="text"
                      value={cnaeAtividade}
                      onChange={(e) => setCnaeAtividade(e.target.value)}
                      placeholder="Ex: 5611-2/01 - Restaurante / Panificação"
                      className="w-full !text-xs !py-1.5 !px-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {servicoId === 'renovacao_alvara' ? 'Nº do Alvará Anterior / Vencimento' : 'E-mail para recebimento do Alvará'}
                    </label>
                    {servicoId === 'renovacao_alvara' ? (
                      <input
                        type="text"
                        value={numAlvaraAnterior}
                        onChange={(e) => setNumAlvaraAnterior(e.target.value)}
                        placeholder="Ex: ALV-2025/0042"
                        className="w-full !text-xs !py-1.5 !px-2.5 font-mono bg-white"
                      />
                    ) : (
                      <input
                        type="email"
                        value={emailContato}
                        onChange={(e) => setEmailContato(e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="w-full !text-xs !py-1.5 !px-2.5 bg-white"
                      />
                    )}
                  </div>
                </div>
              )}

              {(servicoId === 'defesa_auto' || servicoId === 'prorrogacao_prazo' || servicoId === 'desinterdicao') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-amber-50/50 border border-amber-200/80">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      {servicoId === 'defesa_auto'
                        ? 'Nº do Auto de Infração / Penalidade *'
                        : servicoId === 'prorrogacao_prazo'
                        ? 'Nº do Auto de Intimação *'
                        : 'Nº do Termo de Interdição *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={numAutoOuTermo}
                      onChange={(e) => setNumAutoOuTermo(e.target.value)}
                      placeholder="Ex: AI-2026/0142"
                      className="w-full !text-xs !py-1.5 !px-2.5 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Nº do Processo / PAS de Origem (se houver)</label>
                    <input
                      type="text"
                      value={numProcessoRef}
                      onChange={(e) => setNumProcessoRef(e.target.value)}
                      placeholder="Ex: 2026-00125"
                      className="w-full !text-xs !py-1.5 !px-2.5 font-mono bg-white"
                    />
                  </div>
                </div>
              )}

              {servicoId === 'habite_se' && (
                <div className="space-y-2.5 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome da Edificação / Obra *</label>
                      <input
                        type="text"
                        required
                        value={nomeEdificacao}
                        onChange={(e) => setNomeEdificacao(e.target.value)}
                        placeholder="Ex: Residencial Costa Azul"
                        className="w-full !text-xs !py-1.5 !px-2.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo</label>
                      <select value={tipoPeticao} onChange={(e) => setTipoPeticao(e.target.value as any)} className="w-full !text-xs !py-1.5 !px-2 bg-white">
                        <option value="TOTAL">Total</option>
                        <option value="PARCIAL">Parcial</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Nº DIC</label>
                      <input type="text" value={numeroDic} onChange={(e) => setNumeroDic(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 font-mono bg-white" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Área (m²)</label>
                      <input type="text" value={areaM2} onChange={(e) => setAreaM2(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 font-mono bg-white" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Responsável Técnico</label>
                      <input type="text" value={rtNome} onChange={(e) => setRtNome(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">CREA / CAU</label>
                      <input type="text" value={rtRegistro} onChange={(e) => setRtRegistro(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 font-mono bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {(servicoId === 'livro_saude' || servicoId === 'livro_piscina') && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo de Termo</label>
                    <select value={tipoLivroAcao} onChange={(e) => setTipoLivroAcao(e.target.value as any)} className="w-full !text-xs !py-1.5 !px-2 bg-white">
                      <option value="ABERTURA">Abertura</option>
                      <option value="AUTENTICAÇÃO">Autenticação</option>
                      <option value="ENCERRAMENTO">Encerramento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Nº de Ordem / Livro</label>
                    <input
                      type="text"
                      value={numLivroOrdem}
                      onChange={(e) => setNumLivroOrdem(e.target.value)}
                      placeholder="Ex: Livro nº 01 / 200 fls"
                      className="w-full !text-xs !py-1.5 !px-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">RT / Conselho</label>
                    <input
                      type="text"
                      value={conselhoRt}
                      onChange={(e) => setConselhoRt(e.target.value)}
                      placeholder="Nome e CRM/CRF/CRQ"
                      className="w-full !text-xs !py-1.5 !px-2 bg-white"
                    />
                  </div>
                </div>
              )}

              {(servicoId === 'responsabilidade_tecnica' || servicoId === 'parecer_tecnico') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Responsável Técnico (Nome Completo)</label>
                    <input
                      type="text"
                      value={rtNome}
                      onChange={(e) => setRtNome(e.target.value)}
                      placeholder="Nome do profissional"
                      className="w-full !text-xs !py-1.5 !px-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Conselho / Registro Profissional</label>
                    <input
                      type="text"
                      value={conselhoRt}
                      onChange={(e) => setConselhoRt(e.target.value)}
                      placeholder="Ex: CRF-SC 12345 / CRM-SC / CREA"
                      className="w-full !text-xs !py-1.5 !px-2.5 bg-white"
                    />
                  </div>
                </div>
              )}

              {servicoId === 'laudo_potabilidade' && (
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Ponto de Captação / Coleta de Água</label>
                  <input
                    type="text"
                    value={pontoColetaAgua}
                    onChange={(e) => setPontoColetaAgua(e.target.value)}
                    placeholder="Torneira pós-reservatório, poço artesiano, hidrômetro..."
                    className="w-full !text-xs !py-1.5 !px-2.5 bg-white"
                  />
                </div>
              )}

              {servicoId === 'feirante_ambulante' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-md bg-slate-50 border border-slate-200/80">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Feira / Evento</label>
                    <select value={feiraNome} onChange={(e) => setFeiraNome(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 bg-white">
                      <option value="Feira da Cultura">Feira da Cultura</option>
                      <option value="Feira da Barra">Feira da Barra</option>
                      <option value="Feira da Rua 200">Feira da Rua 200</option>
                      <option value="Feira do Pescador">Feira do Pescador</option>
                      <option value="Ambulante / Sazonal">Ambulante / Sazonal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Box / Banca</label>
                    <input type="text" value={codigoBox} onChange={(e) => setCodigoBox(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 font-mono bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Produtos</label>
                    <input type="text" value={produtosFeira} onChange={(e) => setProdutosFeira(e.target.value)} className="w-full !text-xs !py-1.5 !px-2 bg-white" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Assunto do Protocolo *</label>
                <input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  required
                  className="w-full !text-xs !py-2 !px-2.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Detalhes / Justificativa / Documentos Informados
                </label>
                <textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Descreva os detalhes da sua solicitação, razões da defesa/prorrogação ou informações complementares..."
                  className="w-full !text-xs !p-2.5"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-[#f8fafc] hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Anexar documentos / fotos ({anexosNomes.length})</span>
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleAnexarArquivo} />
                </label>
                {anexosNomes.length > 0 && (
                  <span className="text-[11px] text-slate-500 truncate max-w-xs">
                    {anexosNomes.join(', ')}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 rounded bg-[#3b6d96] hover:bg-[#315b7e] text-white font-medium cursor-pointer">
                  {saving
                    ? isExternal
                      ? 'Enviando Solicitação...'
                      : 'Vinculando Pasta...'
                    : isExternal
                    ? 'Enviar Solicitação'
                    : 'Protocolar com Pasta VISA'}
                </button>
              </div>
            </form>
          )}

          {modalKind === 'nova_vistoria' && !isExternal && (
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
                  <input
                    type="text"
                    value={doc}
                    readOnly={Boolean(isSingleDocExternal && lockedExternalDoc)}
                    onChange={(e) => setDoc(e.target.value)}
                    required
                    className={`w-full !text-xs !py-2 !px-2.5 font-mono ${isSingleDocExternal && lockedExternalDoc ? 'bg-slate-100 text-slate-600' : ''}`}
                  />
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
                  {saving ? 'Gravando...' : isExternal ? 'Enviar Requerimento de Habite-se' : 'Protocolar Habite-se na Pasta'}
                </button>
              </div>
            </form>
          )}

          {modalKind === 'novo_feirante' && (
            <form onSubmit={handleSubmitFeirante} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">CPF ou MEI/CNPJ do Feirante *</label>
                  <input
                    type="text"
                    value={doc}
                    readOnly={Boolean(isSingleDocExternal && lockedExternalDoc)}
                    onChange={(e) => setDoc(e.target.value)}
                    required
                    className={`w-full !text-xs !py-2 !px-2.5 font-mono ${isSingleDocExternal && lockedExternalDoc ? 'bg-slate-100 text-slate-600' : ''}`}
                  />
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
                  {saving ? 'Salvando...' : isExternal ? 'Enviar Cadastro de Feirante' : 'Vincular Box à Pasta VISA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
