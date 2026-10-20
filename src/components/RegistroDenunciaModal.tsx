import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  MapPin,
  Send,
  X,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Info,
  Copy,
  Check,
  Building2,
  Trash2,
  Navigation,
  FileText
} from 'lucide-react';
import { BAIRROS_BC } from '../data/mockData';
import { ProcessoItem } from '../types';

interface RegistroDenunciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProcesso?: (processo: ProcessoItem) => void;
}

export const CATEGORIAS_DENUNCIA = [
  { id: 'alimentos', rotulo: 'Alimentos Estragados / Vencidos / Sem Rotulagem', icon: '🥩' },
  { id: 'higiene', rotulo: 'Falta de Higiene / Presença de Insetos / Pragas', icon: '🪳' },
  { id: 'agua_esgoto', rotulo: 'Água Contaminada / Esgoto a Céu Aberto / Caixa de Gordura', icon: '💧' },
  { id: 'clandestino', rotulo: 'Estabelecimento Clandestino / Sem Alvará Sanitário', icon: '🚫' },
  { id: 'saude_medicamentos', rotulo: 'Farmácia / Clínica / Medicamento Irregular', icon: '💊' },
  { id: 'habite_se', rotulo: 'Obra / Edificação com Esgoto / Habite-se Irregular', icon: '🏗️' },
  { id: 'outros', rotulo: 'Outras Irregularidades Sanitárias', icon: '⚠️' }
];

export const RegistroDenunciaModal: React.FC<RegistroDenunciaModalProps> = ({
  isOpen,
  onClose,
  onSaveProcesso
}) => {
  const [categoria, setCategoria] = useState(CATEGORIAS_DENUNCIA[0].rotulo);
  const [nomeEstabelecimento, setNomeEstabelecimento] = useState('');
  const [bairro, setBairro] = useState('Centro');
  const [endereco, setEndereco] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [anonimo, setAnonimo] = useState(true);
  const [nomeDenunciante, setNomeDenunciante] = useState('');
  const [contatoDenunciante, setContatoDenunciante] = useState('');
  const [coordenadasGps, setCoordenadasGps] = useState<{ lat: number; lng: number } | null>(null);
  const [obtendoGps, setObtendoGps] = useState(false);

  // Estado de Sucesso
  const [denunciaEnviada, setDenunciaEnviada] = useState<{
    protocolo: string;
    dataHora: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo seu navegador.');
      return;
    }
    setObtendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordenadasGps({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5))
        });
        setObtendoGps(false);
      },
      (err) => {
        console.warn('Erro ao obter GPS:', err);
        setObtendoGps(false);
        alert('Não foi possível obter a localização exata do GPS. Preencha o endereço manualmente.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleUploadFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).slice(0, 4 - fotos.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setFotos((prev) => [...prev, String(reader.result)]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoverFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricao.trim()) {
      alert('Por favor, descreva detalhadamente a irregularidade constatada.');
      return;
    }

    const agora = new Date();
    const seq = Math.floor(100 + Math.random() * 900);
    const novoProtocolo = `DEN-2026/${seq}`;
    const dataHoraStr = agora.toISOString().replace('T', ' ').substring(0, 16);

    // Cria processo no sistema para cair imediatamente na triagem da Diretoria e no GEO VISA
    const novoProcessoDenuncia: ProcessoItem = {
      id: `den-${Date.now()}`,
      num_processo: novoProtocolo,
      data_protocolo: agora.toISOString().split('T')[0],
      cnpj_cpf: 'DENÚNCIA CIDADÃO',
      razao_social: nomeEstabelecimento ? `${nomeEstabelecimento.toUpperCase()} (DENÚNCIA)` : 'ESTABELECIMENTO DENUNCIADO',
      nome_fantasia: nomeEstabelecimento || 'Local Denunciado por Munícipe',
      assunto: `[DENÚNCIA CIDADÃO] ${categoria}`,
      bairro: bairro || 'Centro',
      endereco: `${endereco || 'Endereço a averiguar'} ${pontoReferencia ? `(Ref: ${pontoReferencia})` : ''}`,
      fiscal_responsavel: 'A Distribuir (Triagem Diretoria)',
      status: 'EM ANÁLISE',
      setor: 'DENÚNCIA / OUVIDORIA',
      motivacao: `Denúncia Cidadão: ${categoria}`,
      grau_risco: 'ALTO RISCO',
      prioridade_demanda: 'URGENTE',
      observacoes: `[RELATO DO CIDADÃO (${anonimo ? 'ANÔNIMO' : nomeDenunciante})]: ${descricao}. Contato: ${anonimo ? 'Anônimo' : contatoDenunciante}`,
      tramitacoes: [
        {
          id: `tram-den-${Date.now()}`,
          data_hora: dataHoraStr,
          tipo: 'PROTOCOLO_CRIADO',
          titulo: 'Denúncia Registrada via Portal do Cidadão',
          descricao: `Denúncia registrada pelo Portal do Cidadão sob protocolo ${novoProtocolo}. Encaminhado para triagem imediata da Diretoria da VISA. Categoria: ${categoria}.`,
          responsavel_nome: anonimo ? 'Munícipe (Anônimo)' : `Cidadão (${nomeDenunciante})`,
          setor_origem: 'PORTAL DO CIDADÃO',
          setor_destino: 'DIRETORIA DE VIGILÂNCIA SANITÁRIA',
          status_processo_momento: 'EM ANÁLISE'
        }
      ]
    };

    if (coordenadasGps) {
      (novoProcessoDenuncia as any).latitude = coordenadasGps.lat;
      (novoProcessoDenuncia as any).longitude = coordenadasGps.lng;
    }

    // Salva processo se handler foi provido
    if (onSaveProcesso) {
      onSaveProcesso(novoProcessoDenuncia);
    } else {
      try {
        const salvos = JSON.parse(localStorage.getItem('visa_processos') || '[]');
        localStorage.setItem('visa_processos', JSON.stringify([novoProcessoDenuncia, ...salvos]));
      } catch {}
    }

    // Salva histórico de denúncias
    try {
      const historicoDenuncias = JSON.parse(localStorage.getItem('visa_denuncias_historico') || '[]');
      historicoDenuncias.unshift({
        protocolo: novoProtocolo,
        dataHora: dataHoraStr,
        categoria,
        estabelecimento: nomeEstabelecimento,
        endereco,
        bairro,
        descricao,
        anonimo
      });
      localStorage.setItem('visa_denuncias_historico', JSON.stringify(historicoDenuncias));
    } catch {}

    setDenunciaEnviada({
      protocolo: novoProtocolo,
      dataHora: agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
  };

  const handleCopiarProtocolo = () => {
    if (!denunciaEnviada) return;
    navigator.clipboard.writeText(denunciaEnviada.protocolo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#111726] border border-red-500/40 text-slate-100 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-4">
        
        {/* Cabeçalho */}
        <div className="p-5 bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-lg">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Ouvidoria & Denúncia Sanitária
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-400/30 font-mono">
                  BALNEÁRIO CAMBORIÚ
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Canal oficial e sigiloso de proteção à saúde pública da população
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal de Sucesso após envio */}
        {denunciaEnviada ? (
          <div className="p-6 sm:p-8 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-white uppercase tracking-wide">
                Denúncia Registrada com Sucesso!
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Sua manifestação foi cadastrada e encaminhada com prioridade para a equipe de triagem e fiscalização da Vigilância Sanitária de Balneário Camboriú.
              </p>
            </div>

            {/* Cartão do Protocolo */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 max-w-sm mx-auto space-y-3 shadow-inner">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Número de Protocolo Oficial
              </span>
              <div className="text-2xl font-black text-red-400 font-mono tracking-wider">
                {denunciaEnviada.protocolo}
              </div>
              <p className="text-[10px] text-slate-400">
                Registrado em {denunciaEnviada.dataHora}
              </p>

              <button
                type="button"
                onClick={handleCopiarProtocolo}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-600"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? 'Protocolo Copiado!' : 'Copiar Número de Protocolo'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/50 border border-blue-800/60 text-xs text-blue-200 max-w-md mx-auto leading-relaxed text-left flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Guarde este número. O fiscal sanitário realizará a vistoria no endereço indicado e você poderá consultar o andamento a qualquer momento pela busca do portal.
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer"
            >
              Concluir & Fechar
            </button>
          </div>
        ) : (
          /* Formulário de Registro */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs text-slate-200 max-h-[75vh] overflow-y-auto">
            
            {/* Aviso de Sigilo */}
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-start gap-3 text-[11px] text-amber-200 leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Garantia de Sigilo:</strong> A Ouvidoria da Vigilância Sanitária garante o sigilo absoluto dos dados do denunciante nos termos da Lei Federal nº 13.460/2017 e da LGPD. Você também pode optar pela denúncia 100% anônima.
              </span>
            </div>

            {/* 1. Categoria da Denúncia */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-300 block mb-2">
                1. Tipo de Irregularidade Sanitária *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold text-xs focus:border-red-500 focus:outline-none"
              >
                {CATEGORIAS_DENUNCIA.map((cat) => (
                  <option key={cat.id} value={cat.rotulo}>
                    {cat.icon} {cat.rotulo}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Identificação do Local */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Nome do Estabelecimento ou Placa
                </label>
                <input
                  type="text"
                  value={nomeEstabelecimento}
                  onChange={(e) => setNomeEstabelecimento(e.target.value)}
                  placeholder="Ex: Pastelaria do Calçadão, Supermercado XYZ..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none placeholder-slate-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Bairro em Balneário Camboriú *
                </label>
                <select
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                >
                  {BAIRROS_BC.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                  Rua / Avenida e Número (ou Referência de Local) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Av. Atlântica, em frente ao quiosque 14 / Rua 1500, nº 320"
                    className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none placeholder-slate-500"
                  />

                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={obtendoGps}
                    className="px-3 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 font-bold text-[11px] uppercase flex items-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-50"
                    title="Obter coordenadas GPS da localização atual"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${obtendoGps ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{coordenadasGps ? 'GPS Ativo ✓' : 'Usar GPS'}</span>
                  </button>
                </div>
                {coordenadasGps && (
                  <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                    📍 Coordenadas capturadas: {coordenadasGps.lat}, {coordenadasGps.lng}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Descrição Detalhada */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-300 block mb-1">
                3. Descrição Detalhada da Irregularidade *
              </label>
              <textarea
                rows={4}
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o que aconteceu: data/horário em que presenciou, produto estragado, cheiro, descarte incorreto de esgoto, condições do ambiente..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed focus:border-red-500 focus:outline-none placeholder-slate-500 font-sans"
              />
            </div>

            {/* 4. Anexar Fotos / Evidências */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>4. Fotos ou Evidências (Opcional - até 4 fotos)</span>
                <span className="text-[10px] text-slate-400 font-mono">{fotos.length}/4 fotos</span>
              </label>

              <div className="flex flex-wrap gap-2.5 items-center">
                {fotos.map((foto, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 group">
                    <img src={foto} alt="Evidência" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoverFoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-white rounded-md transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {fotos.length < 4 && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-red-500/60 bg-slate-900/60 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-slate-400 hover:text-white">
                    <Camera className="w-5 h-5 text-red-400" />
                    <span className="text-[9px] font-bold uppercase">Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadFotos}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 5. Opção de Anonimato */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Deseja manter denúncia anônima?</span>
                  <span className="text-[10px] text-slate-400">Não exige seu nome ou CPF para registro</span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonimo}
                    onChange={(e) => setAnonimo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {!anonimo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Seu Nome Completo (Sigiloso)
                    </label>
                    <input
                      type="text"
                      value={nomeDenunciante}
                      onChange={(e) => setNomeDenunciante(e.target.value)}
                      placeholder="Nome do cidadão..."
                      className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Telefone ou E-mail para Retorno
                    </label>
                    <input
                      type="text"
                      value={contatoDenunciante}
                      onChange={(e) => setContatoDenunciante(e.target.value)}
                      placeholder="(47) 99999-9999 ou email@..."
                      className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botões do Rodapé */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Denúncia à Vigilância Sanitária</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
