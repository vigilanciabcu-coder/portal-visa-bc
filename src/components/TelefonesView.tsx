import React, { useState, useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  Search,
  Copy,
  Check,
  Building,
  Printer,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  PhoneForwarded,
  Filter,
  Layers,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { UserProfile } from '../types';

export interface ContatoTelefone {
  id: string;
  setor: string;
  sigla?: string;
  telefone?: string;
  ramal?: string;
  categoria: 'VIGILÂNCIA' | 'ATENDIMENTO' | 'SAÚDE' | 'ADMINISTRATIVO' | 'GERAL';
  destaque?: boolean;
  horario?: string;
  whatsapp?: boolean;
  is0800?: boolean;
}

export const LISTA_TELEFONES_RAMAIS: ContatoTelefone[] = [
  {
    id: 'pref',
    setor: 'PREFEITURA ( 12H ÀS 17h )',
    telefone: '(47) 3267-7000',
    ramal: '',
    categoria: 'GERAL',
    horario: '12h às 17h'
  },
  {
    id: 'ouv',
    setor: 'OUVIDORIA',
    telefone: '(47) 3267-7024',
    ramal: '',
    categoria: 'ATENDIMENTO'
  },
  {
    id: 'ouv_0800',
    setor: 'OUVIDORIA 0800',
    telefone: '0800-644-3388',
    ramal: '',
    categoria: 'ATENDIMENTO',
    is0800: true
  },
  {
    id: 'ouv_wpp',
    setor: 'OUVIDORIA / WHATSAPP',
    telefone: '(47) 99982-1979',
    ramal: '',
    categoria: 'ATENDIMENTO',
    whatsapp: true
  },
  {
    id: 'visa',
    setor: 'VIGILÂNCIA SANITÁRIA',
    sigla: 'DVIS',
    telefone: '(47) 3261-6280',
    ramal: '',
    categoria: 'VIGILÂNCIA',
    destaque: true
  },
  {
    id: 'alim',
    setor: 'ALIMENTOS',
    sigla: 'DAL',
    telefone: '(47) 3261-6256',
    ramal: '4034 / 8152',
    categoria: 'VIGILÂNCIA'
  },
  {
    id: 'alim2_sane',
    setor: 'ALIMENTOS II / SANEAMENTO',
    sigla: 'SANEAMENTO',
    telefone: '(47) 3261-6233',
    ramal: '4031',
    categoria: 'VIGILÂNCIA'
  },
  {
    id: 'ccpu',
    setor: 'CCPU',
    sigla: 'CCPU',
    telefone: '(47) 3261-6208',
    ramal: '4259',
    categoria: 'VIGILÂNCIA'
  },
  {
    id: 'dengue',
    setor: 'DENGUE',
    sigla: 'DENGUE',
    telefone: '(47) 3261-6264',
    ramal: '8154 / 4037 / 4038 fiscal / 4039 diretor',
    categoria: 'VIGILÂNCIA'
  },
  {
    id: 'serv_saude',
    setor: 'SERVIÇO SAÚDE',
    sigla: 'DFSIS',
    telefone: '(47) 3261-6252',
    ramal: '4033 / 8151',
    categoria: 'VIGILÂNCIA'
  },
  {
    id: 'adm_saude',
    setor: 'ADMINISTRAÇÃO SAÚDE',
    telefone: '',
    ramal: '4072',
    categoria: 'SAÚDE'
  },
  {
    id: 'as_social',
    setor: 'ASSISTÊNCIA SOCIAL',
    telefone: '',
    ramal: '4203',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 'compras',
    setor: 'COMPRAS',
    telefone: '(47) 3261-6238',
    ramal: '8162',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 'contab',
    setor: 'CONTABILIDADE',
    telefone: '(47) 3261-6282',
    ramal: '8161',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 'gab_saude',
    setor: 'GABINETE SEC. SAÚDE',
    telefone: '',
    ramal: '8164',
    categoria: 'SAÚDE'
  },
  {
    id: 'ti',
    setor: 'INFORMÁTICA',
    sigla: 'TI',
    telefone: '(47) 3261-6263',
    ramal: '8002',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 'jur',
    setor: 'JURÍDICO',
    telefone: '(47) 3261-6236',
    ramal: '8163',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 'tfd_reg',
    setor: 'REGULAÇÃO TFD',
    sigla: 'TFD',
    telefone: '(47) 3264-8554',
    ramal: '8131',
    categoria: 'SAÚDE'
  },
  {
    id: 'tfd_fora',
    setor: 'TDF / TRATAMENTO FORA DOMICÍLIO',
    sigla: 'TFD',
    telefone: '(47) 3264-8554',
    ramal: '4027',
    categoria: 'SAÚDE'
  },
  {
    id: 'rh',
    setor: 'RH RECURSOS HUMANOS',
    sigla: 'RH',
    telefone: '(47) 3261-6215',
    ramal: '8148',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 'sim',
    setor: 'SIM / SERVIÇO DE INSPEÇÃO MUNICIPAL',
    sigla: 'SIM',
    telefone: '(47) 3261-6208',
    ramal: '8184',
    categoria: 'VIGILÂNCIA'
  },
  {
    id: 'telefonista',
    setor: 'TELEFONISTA',
    telefone: '(47) 3261-6200',
    ramal: '4179',
    categoria: 'ATENDIMENTO'
  },
  {
    id: 'ubs_central',
    setor: 'UBS CENTRAL - DIREÇÃO',
    sigla: 'UBS',
    telefone: '(47) 3261-6205 / (47) 3267-7012',
    ramal: '8107',
    categoria: 'SAÚDE'
  },
  {
    id: 'vepi',
    setor: 'VIGILÂNCIA EPIDEMIOLÓGICA',
    sigla: 'DVE',
    telefone: '(47) 3261-6207',
    ramal: '8136',
    categoria: 'VIGILÂNCIA'
  }
];

interface TelefonesViewProps {
  currentUser: UserProfile | null;
  onBack?: () => void;
}

export const TelefonesView: React.FC<TelefonesViewProps> = ({ currentUser, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isServidor = currentUser?.tipo_usuario === 'SERVIDOR';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredContatos = useMemo(() => {
    return LISTA_TELEFONES_RAMAIS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'TODOS' || item.categoria === selectedCategory;

      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesCategory;

      const matchesSearch =
        item.setor.toLowerCase().includes(term) ||
        (item.sigla && item.sigla.toLowerCase().includes(term)) ||
        (item.telefone && item.telefone.toLowerCase().includes(term)) ||
        (isServidor && item.ramal && item.ramal.toLowerCase().includes(term)) ||
        item.categoria.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory, isServidor]);

  const categories = [
    { key: 'TODOS', label: 'Todos os Contatos', count: LISTA_TELEFONES_RAMAIS.length },
    { key: 'VIGILÂNCIA', label: 'Vigilância & Inspeção', count: LISTA_TELEFONES_RAMAIS.filter(c => c.categoria === 'VIGILÂNCIA').length },
    { key: 'ATENDIMENTO', label: 'Atendimento & Ouvidoria', count: LISTA_TELEFONES_RAMAIS.filter(c => c.categoria === 'ATENDIMENTO').length },
    { key: 'SAÚDE', label: 'Saúde & UBS', count: LISTA_TELEFONES_RAMAIS.filter(c => c.categoria === 'SAÚDE').length },
    { key: 'ADMINISTRATIVO', label: 'Administrativo & Apoio', count: LISTA_TELEFONES_RAMAIS.filter(c => c.categoria === 'ADMINISTRATIVO').length }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Principal */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-blue-800/50">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition text-white mr-1 cursor-pointer"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xs font-black tracking-widest text-blue-300 uppercase">
                {isServidor ? 'Guia Telefônico & Ramais' : 'Guia Telefônico & Contatos Úteis'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {isServidor ? 'Contatos e Ramais Úteis' : 'Contatos Úteis da Prefeitura'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              {isServidor
                ? 'Diretório oficial de telefones, ramais e canais de atendimento da Prefeitura de Balneário Camboriú, Secretaria de Saúde e Vigilância Sanitária.'
                : 'Diretório oficial de telefones e canais de atendimento da Prefeitura de Balneário Camboriú, Secretaria de Saúde e Vigilância Sanitária.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Imprimir lista de contatos"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              <span>Imprimir / PDF</span>
            </button>
            <div className="bg-white/10 p-1 rounded-xl flex items-center border border-white/20">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Visualização em Tabela"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              isServidor
                ? 'Pesquisar por setor, sigla, telefone ou número de ramal (ex: 4034, DVIS, Ouvidoria)...'
                : 'Pesquisar por setor, sigla ou telefone (ex: DVIS, Ouvidoria, Saúde)...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Categorias Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultados de Contatos */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContatos.map((item) => {
            const cleanPhone = item.telefone?.replace(/\D/g, '') || '';
            const isWpp = item.whatsapp;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 shadow-sm border transition flex flex-col justify-between hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 ${
                  item.destaque
                    ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {item.setor}
                      {item.sigla && (
                        <span className="ml-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                          ({item.sigla})
                        </span>
                      )}
                    </h3>
                    {item.horario && (
                      <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 shrink-0">
                        {item.horario}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  {/* Telefone */}
                  {item.telefone && (
                    <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        {isWpp ? (
                          <MessageSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Phone className="w-4 h-4 text-blue-500" />
                        )}
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {item.telefone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isWpp && (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-sm"
                            title="Conversar no WhatsApp"
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(item.telefone || '', item.id + '-tel')}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition cursor-pointer"
                          title="Copiar telefone"
                        >
                          {copiedId === item.id + '-tel' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ramal - Apenas para Servidores */}
                  {isServidor && item.ramal && (
                    <div className="flex items-center justify-between gap-2 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-100 dark:border-amber-900/50">
                      <div className="flex items-center gap-2">
                        <PhoneForwarded className="w-4 h-4 text-amber-500" />
                        <div className="text-xs">
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 block uppercase">
                            Ramal
                          </span>
                          <span className="font-black text-amber-950 dark:text-amber-200">
                            {item.ramal}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.ramal || '', item.id + '-ramal')}
                        className="bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] font-bold px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Copiar ramal"
                      >
                        {copiedId === item.id + '-ramal' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visualização em Tabela Compacta */
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Setor / Órgão</th>
                  <th className="py-3 px-3">Sigla</th>
                  <th className="py-3 px-4">Telefone Principal</th>
                  {isServidor && <th className="py-3 px-4">Ramal(is)</th>}
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContatos.map((item) => {
                  const cleanPhone = item.telefone?.replace(/\D/g, '') || '';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 dark:text-white">
                          {item.setor}
                        </div>
                        {item.horario && (
                          <div className="text-[10px] text-slate-400">
                            {item.horario}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {item.sigla ? (
                          <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {item.sigla}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.telefone ? (
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <span>{item.telefone}</span>
                            {item.whatsapp && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black">
                                WPP
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Central</span>
                        )}
                      </td>
                      {isServidor && (
                        <td className="py-3 px-4">
                          {item.ramal ? (
                            <span className="font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                              {item.ramal}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.whatsapp && item.telefone && (
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition"
                              title="Abrir WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                `${item.setor}: ${item.telefone || ''}${
                                  isServidor && item.ramal ? ` (Ramal: ${item.ramal})` : ''
                                }`,
                                item.id
                              )
                            }
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                            title="Copiar dados do contato"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredContatos.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 space-y-2">
          <Phone className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200">Nenhum contato encontrado</h4>
          <p className="text-xs text-slate-500">
            Tente buscar com outros termos como número do ramal, setor ou sigla.
          </p>
        </div>
      )}
    </div>
  );
};
