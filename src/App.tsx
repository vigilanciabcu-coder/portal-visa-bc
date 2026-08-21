import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { FiscalizacaoView } from './components/FiscalizacaoView';
import { FeirasView } from './components/FeirasView';
import { AgendaView } from './components/AgendaView';
import { MasterView } from './components/MasterView';
import { ProcessosView } from './components/ProcessosView';
import { LoginModal, TrocaSenhaModal } from './components/Modals';
import { AniversarioModal } from './components/AniversarioModal';

import {
  PortalButton,
  UserProfile,
  EscalaItem,
  FeiranteItem,
  RecadoMural,
  ChatMessage,
  FiscalizacaoItem,
  ProcessoItem,
  AmostraLaboratorioItem,
  PontoColetaLaboratorio,
  ServidorColetaLaboratorio,
  LaboratorialistaResponsavel
} from './types';

import {
  INITIAL_USERS,
  INITIAL_ESCALA,
  INITIAL_FEIRAS,
  INITIAL_MURAL,
  INITIAL_CHAT,
  INITIAL_FISCALIZACOES,
  INITIAL_PROCESSOS,
  INITIAL_LABORATORIO,
  INITIAL_PONTOS_COLETA,
  INITIAL_COLETORES_LABORATORIO,
  INITIAL_LABORATORIALISTAS
} from './data/mockData';

import {
  fetchOperadoresFromSupabase,
  saveOperadorToSupabase,
  deleteOperadorFromSupabase,
  seedInitialOperadoresIfEmpty,
  fetchFiscalizacoesFromSupabase,
  saveFiscalizacaoToSupabase,
  fetchEscalasFromSupabase,
  saveEscalaToSupabase,
  deleteEscalaFromSupabase,
  fetchChatFromSupabase,
  sendChatMessageToSupabase,
  deleteChatMessageFromSupabase,
  subscribeToChatRealtime,
  fetchMuralFromSupabase,
  saveRecadoToSupabase,
  deleteRecadoFromSupabase,
  fetchProcessosFromSupabase,
  saveProcessoToSupabase,
  deleteProcessoFromSupabase,
  fetchLaboratorioFromSupabase,
  saveLaboratorioToSupabase,
  deleteLaboratorioFromSupabase,
  fetchPontosColetaFromSupabase,
  savePontoColetaToSupabase,
  deletePontoColetaFromSupabase
} from './lib/supabaseService';

import {
  fetchProcessosFromSheets,
  saveProcessoToSheets
} from './lib/googleSheetsService';

import { LaboratorioView } from './components/LaboratorioView';

const PORTAL_BUTTONS: PortalButton[] = [
  { id: 'pref', nome: 'Prefeitura', url: 'https://www.bc.sc.gov.br/', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/brasao__1_-removebg-preview%20(1).avif', acao: 'link' },
  { id: 'proc', nome: 'Processos', url: 'https://script.google.com/macros/s/AKfycbyaTV2FDyJ2-tC5l7OXiEvD5DVw2QxH_CHO_rHKmdnYxu8bqDQapmP5K9h6C5TEaWWXTQ/exec', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/processos.avif', acao: 'link' },
  { id: 'tproc', nome: 'Teste Processo', url: '', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/processos.avif', acao: 'view', view: 'processos', badgetext: 'SHEETS', somenteMaster: true },
  { id: '1doc', nome: '1Doc', url: 'https://bc.1doc.com.br/b.php?pg=o/login&n=3', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/1Doc.avif', acao: 'link' },
  { id: 'fisc', nome: 'FISCALIZAÇÃO', url: '', img: 'shield', acao: 'view', view: 'fiscalizacao' },
  { id: 'agen', nome: 'AGENDA', url: '', img: 'calendar', acao: 'view', view: 'agenda' },
  { id: 'feir', nome: 'FEIRAS', url: '', img: 'tent', acao: 'view', view: 'feiras' },
  { id: 'ahgo', nome: 'Ahgora', url: 'https://app.ahgora.com.br/externo/index/prefeiturabc', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/sistemadepontobiometrico.avif', acao: 'link' },
  { id: 'mail', nome: 'BC Mail', url: 'https://mail.bc.sc.gov.br/', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/email.institucional.avif', acao: 'link' },
  { id: 'cnpj', nome: 'CNPJ', url: 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/cnpj_edited.avif', acao: 'link' },
  { id: 'debi', nome: 'Débitos', url: 'https://cidadao.bc.sc.gov.br/cidadao/balneario_camboriu/portal/servicos/debitos?params=NA%3D%3D', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/consultadedebitos.avif', acao: 'link' },
  { id: 'domm', nome: 'DOM', url: 'https://diariomunicipal.sc.gov.br/?r=site/portal&codigoEntidade=31', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/diario-.avif', acao: 'link' },
  { id: 'epub', nome: 'e-Publica', url: 'https://epublica.bc.sc.gov.br/epublica/web/#/balneario_camboriu/login', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/e%20publica.avif', acao: 'link' },
  { id: 'geoo', nome: 'GEO+', url: 'https://geo.bc.sc.gov.br/login', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/geoprocessamento.avif', acao: 'link' },
  { id: 'labo', nome: 'Laboratório', url: 'https://script.google.com/macros/s/AKfycby8SSrv45Hvn7dISRonoyaoe0ffLu8xtwzTB2lWZL09RSqHN-j9RfyDfDHP31nEnVC-Aw/exec', img: 'lab-icon', acao: 'link' },
  { id: 'tlab', nome: 'Teste Laboratório', url: '', img: 'lab-icon', acao: 'view', view: 'laboratorio', badgetext: 'SUPABASE' },
  { id: 'leis', nome: 'Leis', url: 'https://leismunicipais.com.br/legislacao-municipal/4511/leis-de-balneario-camboriu', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/leismunicipais.avif', acao: 'link' },
  { id: 'mapa', nome: 'Mapa', url: 'https://www.google.com.br/maps', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/mapa.avif', acao: 'link' },
  { id: 'regi', nome: 'Regin', url: 'http://200.19.203.151:8080/SiarcoWeb/loginAction.do', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/regin.avif', acao: 'link' },
  { id: 'rhwb', nome: 'RH Web', url: 'https://folhaweb.bc.sc.gov.br/e-servidor/web/#/login', img: 'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/public-assets/rhweb.avif', acao: 'link' }
];

export default function App() {
  // Navigation & View
  const [currentView, setCurrentView] = useState<'home' | 'feiras' | 'agenda' | 'master' | 'fiscalizacao' | 'processos' | 'laboratorio'>('home');

  // App State with Persistence
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('visa_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('visa_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Modals
  const [loginOpen, setLoginOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('visa_current_user');
    return !saved;
  });
  const [trocaSenhaOpen, setTrocaSenhaOpen] = useState(false);

  const [escala, setEscala] = useState<EscalaItem[]>(() => {
    const saved = localStorage.getItem('visa_escala');
    return saved ? JSON.parse(saved) : INITIAL_ESCALA;
  });

  const [feiras, setFeiras] = useState<FeiranteItem[]>(() => {
    const saved = localStorage.getItem('visa_feiras');
    return saved ? JSON.parse(saved) : INITIAL_FEIRAS;
  });

  const [fiscalizacoes, setFiscalizacoes] = useState<FiscalizacaoItem[]>(() => {
    const saved = localStorage.getItem('visa_fiscalizacoes');
    return saved ? JSON.parse(saved) : INITIAL_FISCALIZACOES;
  });

  const [processos, setProcessos] = useState<ProcessoItem[]>(() => {
    const saved = localStorage.getItem('visa_processos');
    return saved ? JSON.parse(saved) : INITIAL_PROCESSOS;
  });

  const [amostrasLaboratorio, setAmostrasLaboratorio] = useState<AmostraLaboratorioItem[]>(() => {
    const saved = localStorage.getItem('visa_laboratorio');
    return saved ? JSON.parse(saved) : INITIAL_LABORATORIO;
  });

  const [pontosColeta, setPontosColeta] = useState<PontoColetaLaboratorio[]>(() => {
    const saved = localStorage.getItem('visa_pontos_coleta');
    return saved ? JSON.parse(saved) : INITIAL_PONTOS_COLETA;
  });

  const [coletoresLaboratorio, setColetoresLaboratorio] = useState<ServidorColetaLaboratorio[]>(() => {
    const saved = localStorage.getItem('visa_coletores_lab');
    return saved ? JSON.parse(saved) : INITIAL_COLETORES_LABORATORIO;
  });

  const [laboratorialistas, setLaboratorialistas] = useState<LaboratorialistaResponsavel[]>(() => {
    const saved = localStorage.getItem('visa_laboratorialistas');
    return saved ? JSON.parse(saved) : INITIAL_LABORATORIALISTAS;
  });

  const [mural, setMural] = useState<RecadoMural[]>(() => {
    const saved = localStorage.getItem('visa_mural');
    return saved ? JSON.parse(saved) : INITIAL_MURAL;
  });

  const [chat, setChat] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('visa_chat');
    return saved ? JSON.parse(saved) : INITIAL_CHAT;
  });

  // Sync com Supabase no carregamento
  useEffect(() => {
    async function loadSupabaseData() {
      const remoteUsers = await fetchOperadoresFromSupabase();
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
      } else {
        // Se a tabela no Supabase estiver vazia, popula com os usuários padrão
        await seedInitialOperadoresIfEmpty(INITIAL_USERS);
      }

      // Carrega fiscalizações do Supabase se existirem
      const remoteFisc = await fetchFiscalizacoesFromSupabase();
      if (remoteFisc && remoteFisc.length > 0) {
        setFiscalizacoes(remoteFisc);
      }

      // Carrega escalas de plantão do Supabase se existirem
      const remoteEscalas = await fetchEscalasFromSupabase();
      if (remoteEscalas && remoteEscalas.length > 0) {
        setEscala(remoteEscalas);
        localStorage.setItem('visa_escala', JSON.stringify(remoteEscalas));
      }

      // Carrega processos do Supabase (tabela processos) e sincroniza com Sheets
      const remoteProcSupabase = await fetchProcessosFromSupabase();
      if (remoteProcSupabase && remoteProcSupabase.length > 0) {
        const mappedProcs = remoteProcSupabase.map((p: any) => ({
          id: p.id,
          num_processo: p.num_processo,
          data_protocolo: p.data_protocolo,
          cnpj_cpf: p.cnpj_cpf,
          razao_social: p.razao_social,
          nome_fantasia: p.nome_fantasia,
          assunto: p.assunto,
          bairro: p.bairro,
          endereco: p.endereco,
          fiscal_responsavel: p.fiscal_responsavel,
          status: p.status,
          validade: p.validade,
          observacoes: p.observacoes,
          cnaes: p.cnaes || [],
          setor: p.setor,
          motivacao: p.motivacao,
          data_entrada: p.data_entrada,
          data_1doc: p.data_1doc,
          venc_1doc: p.venc_1doc,
          prot_1doc: p.prot_1doc,
          pasta: p.pasta,
          cep: p.cep,
          numero_complemento: p.numero_complemento,
          situacao_cadastral: p.situacao_cadastral,
          motivo_situacao: p.motivo_situacao,
          data_situacao: p.data_situacao,
          venc_licenca: p.venc_licenca,
          grau_risco: p.grau_risco,
          data_entregue_fiscal: p.data_entregue_fiscal,
          agendado_para: p.agendado_para,
          conclusao: p.conclusao,
          pas: p.pas
        }));
        setProcessos(mappedProcs);
        localStorage.setItem('visa_processos', JSON.stringify(mappedProcs));
      } else {
        // Fallback: Carrega processos do Google Sheets se existirem
        const remoteProc = await fetchProcessosFromSheets();
        if (remoteProc && remoteProc.length > 0) {
          setProcessos(remoteProc);
          localStorage.setItem('visa_processos', JSON.stringify(remoteProc));
        }
      }

      // Carrega mensagens do chat do Supabase (portal_chat)
      const remoteChat = await fetchChatFromSupabase();
      if (remoteChat && remoteChat.length > 0) {
        setChat(remoteChat);
        localStorage.setItem('visa_chat', JSON.stringify(remoteChat));
      }

      // Carrega recados do mural do Supabase (mural)
      const remoteMural = await fetchMuralFromSupabase();
      if (remoteMural && remoteMural.length > 0) {
        setMural(remoteMural);
        localStorage.setItem('visa_mural', JSON.stringify(remoteMural));
      }

      // Carrega amostras do laboratório do Supabase
      const remoteLab = await fetchLaboratorioFromSupabase();
      if (remoteLab && remoteLab.length > 0) {
        setAmostrasLaboratorio(remoteLab);
        localStorage.setItem('visa_laboratorio', JSON.stringify(remoteLab));
      }

      // Carrega pontos de coleta do Supabase
      const remotePontos = await fetchPontosColetaFromSupabase();
      if (remotePontos && remotePontos.length > 0) {
        setPontosColeta(remotePontos);
        localStorage.setItem('visa_pontos_coleta', JSON.stringify(remotePontos));
      }
    }
    loadSupabaseData();
  }, []);

  // Realtime & Polling Sync para o Chat Interno (portal_chat)
  useEffect(() => {
    const unsubscribe = subscribeToChatRealtime((newMsg) => {
      setChat((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const updated = [...prev, newMsg];
        localStorage.setItem('visa_chat', JSON.stringify(updated));
        return updated;
      });
    });

    const chatInterval = setInterval(async () => {
      const remote = await fetchChatFromSupabase();
      if (remote && remote.length > 0) {
        setChat(remote);
        localStorage.setItem('visa_chat', JSON.stringify(remote));
      }
    }, 6000);

    return () => {
      unsubscribe();
      clearInterval(chatInterval);
    };
  }, []);

  // LocalStorage Effects
  useEffect(() => {
    localStorage.setItem('visa_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('visa_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('visa_current_user');
      setLoginOpen(true);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('visa_escala', JSON.stringify(escala));
  }, [escala]);

  useEffect(() => {
    localStorage.setItem('visa_feiras', JSON.stringify(feiras));
  }, [feiras]);

  useEffect(() => {
    localStorage.setItem('visa_fiscalizacoes', JSON.stringify(fiscalizacoes));
  }, [fiscalizacoes]);

  useEffect(() => {
    localStorage.setItem('visa_mural', JSON.stringify(mural));
  }, [mural]);

  useEffect(() => {
    localStorage.setItem('visa_chat', JSON.stringify(chat));
  }, [chat]);

  // Atualização automática (F5) após 5 minutos para recarregar dados e retornar à tela inicial
  useEffect(() => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    let timer: NodeJS.Timeout;

    const scheduleReload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Recarrega na tela inicial (F5)
        window.location.href = window.location.pathname;
      }, FIVE_MINUTES_MS);
    };

    scheduleReload();

    // Reinicia o contador se houver atividade do usuário para evitar perda de dados em digitação
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => scheduleReload();

    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, []);

  // Handlers
  const handleToggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  const handleOpenExternal = (url: string) => {
    window.open(url, '_blank');
  };

  const handleSendMessage = async (text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const senderName = currentUser ? currentUser.nome_completo.split(' ')[0] : 'Operador';
    const role = currentUser ? currentUser.cargo : 'AGENTE';
    const perfilId = currentUser ? currentUser.id : undefined;

    const tempId = `chat-${Date.now()}`;
    const localMsg: ChatMessage = {
      id: tempId,
      sender: senderName,
      role,
      time: timeStr,
      text,
      perfil_id: perfilId
    };

    setChat((prev) => [...prev, localMsg]);

    // Salva na tabela portal_chat do Supabase
    const savedMsg = await sendChatMessageToSupabase(senderName, text, perfilId);
    if (savedMsg) {
      setChat((prev) => prev.map((m) => (m.id === tempId ? savedMsg : m)));
    }
  };

  const handleDeleteChatMessage = async (id: string) => {
    setChat((prev) => prev.filter((m) => m.id !== id));
    await deleteChatMessageFromSupabase(id);
  };

  const handleSaveFeirante = (item: FeiranteItem) => {
    setFeiras((prev) => {
      const idx = prev.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = item;
        return copy;
      }
      return [item, ...prev];
    });
  };

  const handleDeleteFeirante = (id: string) => {
    setFeiras((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      localStorage.setItem('visa_feiras', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSyncFeirantesFromSheets = (items: FeiranteItem[]) => {
    setFeiras(items);
    localStorage.setItem('visa_feiras', JSON.stringify(items));
  };

  const handleSaveEscalaItem = async (item: EscalaItem) => {
    setEscala((prev) => {
      const idx = prev.findIndex((x) => x.id === item.id);
      let updated: EscalaItem[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = item;
      } else {
        updated = [item, ...prev];
      }
      localStorage.setItem('visa_escala', JSON.stringify(updated));
      return updated;
    });

    // Salva na tabela escala do Supabase
    const saved = await saveEscalaToSupabase(item);
    if (saved && saved.id !== item.id) {
      setEscala((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    }
  };

  const handleDeleteEscalaItem = async (itemId: string) => {
    setEscala((prev) => {
      const updated = prev.filter((x) => x.id !== itemId);
      localStorage.setItem('visa_escala', JSON.stringify(updated));
      return updated;
    });

    // Remove da tabela escala do Supabase
    await deleteEscalaFromSupabase(itemId);
  };

  const handleSaveRecado = async (recado: RecadoMural) => {
    setMural((prev) => {
      const idx = prev.findIndex((x) => x.id === recado.id);
      let updated: RecadoMural[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = recado;
      } else {
        updated = [recado, ...prev];
      }
      localStorage.setItem('visa_mural', JSON.stringify(updated));
      return updated;
    });

    // Salva na tabela recados_mural do Supabase
    await saveRecadoToSupabase(recado);
    const remote = await fetchMuralFromSupabase();
    if (remote && remote.length > 0) {
      setMural(remote);
      localStorage.setItem('visa_mural', JSON.stringify(remote));
    }
  };

  const handleDeleteRecado = async (recadoId: string) => {
    setMural((prev) => {
      const updated = prev.filter((x) => x.id !== recadoId);
      localStorage.setItem('visa_mural', JSON.stringify(updated));
      return updated;
    });

    // Remove da tabela recados_mural do Supabase
    await deleteRecadoFromSupabase(recadoId);
    const remote = await fetchMuralFromSupabase();
    if (remote) {
      setMural(remote);
      localStorage.setItem('visa_mural', JSON.stringify(remote));
    }
  };

  const handleSaveFiscalizacao = async (item: FiscalizacaoItem) => {
    setFiscalizacoes((prev) => [item, ...prev]);
    await saveFiscalizacaoToSupabase(item);
  };

  const handleDeleteFiscalizacao = (id: string) => {
    setFiscalizacoes((prev) => {
      const updated = prev.filter((x) => x.id !== id);
      localStorage.setItem('visa_fiscalizacoes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveUser = async (user: UserProfile): Promise<boolean> => {
    // 1. Atualização imediata do estado local
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = user;
        localStorage.setItem('visa_users', JSON.stringify(copy));
        return copy;
      }
      const updated = [...prev, user];
      localStorage.setItem('visa_users', JSON.stringify(updated));
      return updated;
    });

    if (currentUser && (currentUser.id === user.id || currentUser.email.toLowerCase() === user.email.toLowerCase())) {
      setCurrentUser(user);
      localStorage.setItem('visa_current_user', JSON.stringify(user));
    }

    // 2. Salva ou atualiza no Supabase
    const savedRemote = await saveOperadorToSupabase(user);
    if (savedRemote) {
      const remote = await fetchOperadoresFromSupabase();
      if (remote && remote.length > 0) {
        setUsers(remote);
        localStorage.setItem('visa_users', JSON.stringify(remote));
        if (currentUser) {
          const updatedCurrent = remote.find((r) => r.id === currentUser.id || r.email.toLowerCase() === currentUser.email.toLowerCase());
          if (updatedCurrent) {
            setCurrentUser(updatedCurrent);
            localStorage.setItem('visa_current_user', JSON.stringify(updatedCurrent));
          }
        }
      }
    }
    return savedRemote;
  };

  const handleDeleteUser = (userId: string) => {
    const userObj = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    // Exclui do Supabase em segundo plano
    deleteOperadorFromSupabase(userId, userObj?.email);
  };

  const handleSaveProcesso = async (item: ProcessoItem) => {
    setProcessos((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      let updated: ProcessoItem[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = item;
      } else {
        updated = [item, ...prev];
      }
      localStorage.setItem('visa_processos', JSON.stringify(updated));
      return updated;
    });

    // Salva na tabela processos do Supabase
    await saveProcessoToSupabase(item);

    // Envia automaticamente para a Planilha do Google Sheets (Apps Script)
    await saveProcessoToSheets(item);
  };

  const handleDeleteProcesso = async (id: string) => {
    const itemObj = processos.find((p) => p.id === id);
    setProcessos((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('visa_processos', JSON.stringify(updated));
      return updated;
    });

    // Exclui da tabela processos do Supabase
    await deleteProcessoFromSupabase(id, itemObj?.num_processo);
  };

  const handleSaveLaboratorio = async (item: AmostraLaboratorioItem) => {
    setAmostrasLaboratorio((prev) => {
      const idx = prev.findIndex((a) => a.id === item.id || a.codigo_amostra === item.codigo_amostra);
      let updated: AmostraLaboratorioItem[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = item;
      } else {
        updated = [item, ...prev];
      }
      localStorage.setItem('visa_laboratorio', JSON.stringify(updated));
      return updated;
    });

    // Salva no Supabase
    await saveLaboratorioToSupabase(item);
  };

  const handleDeleteLaboratorio = async (id: string) => {
    const itemObj = amostrasLaboratorio.find((a) => a.id === id);
    setAmostrasLaboratorio((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem('visa_laboratorio', JSON.stringify(updated));
      return updated;
    });

    // Exclui no Supabase
    await deleteLaboratorioFromSupabase(id, itemObj?.codigo_amostra);
  };

  const handleSavePontoColeta = async (ponto: PontoColetaLaboratorio) => {
    setPontosColeta((prev) => {
      const idx = prev.findIndex((p) => p.id === ponto.id);
      let updated: PontoColetaLaboratorio[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = ponto;
      } else {
        updated = [ponto, ...prev];
      }
      localStorage.setItem('visa_pontos_coleta', JSON.stringify(updated));
      return updated;
    });

    // Salva no Supabase
    await savePontoColetaToSupabase(ponto);
  };

  const handleDeletePontoColeta = async (id: string) => {
    setPontosColeta((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem('visa_pontos_coleta', JSON.stringify(updated));
      return updated;
    });

    // Exclui no Supabase
    await deletePontoColetaFromSupabase(id);
  };

  const handleSaveColetor = (item: ServidorColetaLaboratorio) => {
    setColetoresLaboratorio((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      let updated: ServidorColetaLaboratorio[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = item;
      } else {
        updated = [...prev, item];
      }
      localStorage.setItem('visa_coletores_lab', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteColetor = (id: string) => {
    setColetoresLaboratorio((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem('visa_coletores_lab', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveLaboratorialista = (item: LaboratorialistaResponsavel) => {
    setLaboratorialistas((prev) => {
      let copy = [...prev];
      if (item.padrao) {
        // Se este foi marcado como padrão, desmarca os outros
        copy = copy.map((l) => ({ ...l, padrao: l.id === item.id }));
      }
      const idx = copy.findIndex((l) => l.id === item.id);
      let updated: LaboratorialistaResponsavel[];
      if (idx >= 0) {
        copy[idx] = item;
        updated = copy;
      } else {
        updated = [...copy, item];
      }
      localStorage.setItem('visa_laboratorialistas', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteLaboratorialista = (id: string) => {
    setLaboratorialistas((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      localStorage.setItem('visa_laboratorialistas', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetSystemData = () => {
    setUsers(INITIAL_USERS);
    setEscala(INITIAL_ESCALA);
    setFeiras(INITIAL_FEIRAS);
    setFiscalizacoes(INITIAL_FISCALIZACOES);
    setProcessos(INITIAL_PROCESSOS);
    setAmostrasLaboratorio(INITIAL_LABORATORIO);
    setPontosColeta(INITIAL_PONTOS_COLETA);
    setColetoresLaboratorio(INITIAL_COLETORES_LABORATORIO);
    setLaboratorialistas(INITIAL_LABORATORIALISTAS);
    setMural(INITIAL_MURAL);
    setChat(INITIAL_CHAT);
    localStorage.clear();
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex flex-col h-screen overflow-hidden text-slate-900 dark:text-slate-100 font-sans text-center">
      {/* Shell Container */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header Bar */}
        <Header
          currentUser={currentUser}
          users={users}
          onSelectUser={(user) => setCurrentUser(user)}
          onOpenTrocaSenha={() => setTrocaSenhaOpen(true)}
          onLogout={() => {
            setCurrentUser(null);
            setLoginOpen(true);
          }}
          onToggleDarkMode={handleToggleDarkMode}
          onGoHome={() => setCurrentView('home')}
        />

        {/* Main Workspace Layout */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Collapsible Hover Sidebar */}
          <Sidebar
            buttons={PORTAL_BUTTONS}
            currentView={currentView}
            currentUser={currentUser}
            onNavigate={(v) => setCurrentView(v)}
            onOpenExternal={handleOpenExternal}
          />

          {/* Main Display Area */}
          <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex flex-col relative">
            <div className="flex-1 p-2 sm:p-4 md:p-5 lg:p-6 pb-28">
              {currentView === 'home' && (
                <HomeView
                  buttons={PORTAL_BUTTONS}
                  escala={escala}
                  users={users}
                  mural={mural}
                  chat={chat}
                  currentUser={currentUser}
                  onNavigate={(v) => setCurrentView(v)}
                  onOpenExternal={handleOpenExternal}
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={handleDeleteChatMessage}
                />
              )}

              {currentView === 'fiscalizacao' && (
                <FiscalizacaoView
                  fiscalizacoes={fiscalizacoes}
                  currentUser={currentUser}
                  onSaveFiscalizacao={handleSaveFiscalizacao}
                  onDeleteFiscalizacao={handleDeleteFiscalizacao}
                />
              )}

              {currentView === 'feiras' && (
                <FeirasView
                  feiras={feiras}
                  onSaveFeirante={handleSaveFeirante}
                  onDeleteFeirante={handleDeleteFeirante}
                  onSyncFeirantesFromSheets={handleSyncFeirantesFromSheets}
                />
              )}

              {currentView === 'agenda' && (
                <AgendaView
                  escala={escala}
                  onSaveEscalaItem={handleSaveEscalaItem}
                  onDeleteEscalaItem={handleDeleteEscalaItem}
                  users={users}
                  currentUser={currentUser}
                />
              )}

              {currentView === 'processos' && (
                <ProcessosView
                  processos={processos}
                  currentUser={currentUser}
                  users={users}
                  onSaveProcesso={handleSaveProcesso}
                  onDeleteProcesso={handleDeleteProcesso}
                />
              )}

              {currentView === 'laboratorio' && (
                <LaboratorioView
                  amostras={amostrasLaboratorio}
                  pontos={pontosColeta}
                  coletores={coletoresLaboratorio}
                  laboratorialistas={laboratorialistas}
                  currentUser={currentUser}
                  users={users}
                  onSaveAmostra={handleSaveLaboratorio}
                  onDeleteAmostra={handleDeleteLaboratorio}
                  onSavePonto={handleSavePontoColeta}
                  onDeletePonto={handleDeletePontoColeta}
                  onSaveColetor={handleSaveColetor}
                  onDeleteColetor={handleDeleteColetor}
                  onSaveLaboratorialista={handleSaveLaboratorialista}
                  onDeleteLaboratorialista={handleDeleteLaboratorialista}
                />
              )}

              {currentView === 'master' && (
                (currentUser?.nivel_acesso?.toUpperCase().includes('MASTER') || currentUser?.nivel_acesso === 'MASTER (TUDO)') ? (
                  <MasterView
                    currentUser={currentUser}
                    users={users}
                    onSaveUser={handleSaveUser}
                    onDeleteUser={handleDeleteUser}
                    escala={escala}
                    onSaveEscalaItem={handleSaveEscalaItem}
                    onDeleteEscalaItem={handleDeleteEscalaItem}
                    mural={mural}
                    onSaveRecado={handleSaveRecado}
                    onDeleteRecado={handleDeleteRecado}
                    fiscalizacoes={fiscalizacoes}
                    feiras={feiras}
                    onResetSystemData={handleResetSystemData}
                  />
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-xl mx-auto text-center border border-red-200 dark:border-red-900 shadow-xl space-y-4 my-12">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-950/80 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
                      🚫
                    </div>
                    <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">Acesso Restrito ao Painel Master</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Seu perfil está configurado com o nível de acesso <strong className="text-purple-600 dark:text-purple-400">{currentUser?.nivel_acesso || 'VISA'}</strong>. O Painel Master requer a permissão <strong className="text-purple-600 dark:text-purple-400">MASTER (TUDO)</strong>.
                    </p>
                    <button
                      onClick={() => setCurrentView('home')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase cursor-pointer transition shadow"
                    >
                      Voltar ao Início
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Footer Bar */}
            <Footer />
          </main>
        </div>
      </div>

      {/* Modals */}
      <LoginModal
        isOpen={loginOpen}
        users={users}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          setLoginOpen(false);
        }}
      />

      <TrocaSenhaModal
        isOpen={trocaSenhaOpen}
        currentUser={currentUser}
        onSaveUser={handleSaveUser}
        onClose={() => setTrocaSenhaOpen(false)}
      />

      {/* Janela Especial de Aniversário (1º acesso do dia) */}
      <AniversarioModal currentUser={currentUser} />
    </div>
  );
}
