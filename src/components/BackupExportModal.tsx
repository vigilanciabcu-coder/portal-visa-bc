import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Archive,
  Database,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Layers,
  FolderArchive,
  FileSignature,
  Microscope,
  MapPin,
  Tent,
  Users,
  Check
} from 'lucide-react';
import {
  CompleteSystemData,
  exportFiscalizacoesToCSV,
  exportProcessosToCSV,
  exportLaboratorioToCSV,
  exportPontosColetaToCSV,
  exportPastasVisaToCSV,
  exportAlvarasToCSV,
  exportFeirasToCSV,
  exportEscalaToCSV,
  exportUsersToCSV,
  downloadCsvFile,
  downloadBlobFile,
  generateBackupZip
} from '../lib/csvExportService';

interface BackupExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CompleteSystemData;
}

export const BackupExportModal: React.FC<BackupExportModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  // Trigger feedback visual temporário
  const notifyDownloaded = (key: string) => {
    setDownloadedKey(key);
    setTimeout(() => setDownloadedKey(null), 3000);
  };

  // 1. Download Individual: Fiscalizações
  const handleDownloadFiscalizacoes = () => {
    const csv = exportFiscalizacoesToCSV(data.fiscalizacoes || []);
    downloadCsvFile(`fiscalizacoes_sanitarias_bc_${todayStr}`, csv);
    notifyDownloaded('fiscalizacoes');
  };

  // 2. Download Individual: Processos
  const handleDownloadProcessos = () => {
    const csv = exportProcessosToCSV(data.processos || []);
    downloadCsvFile(`processos_administrativos_bc_${todayStr}`, csv);
    notifyDownloaded('processos');
  };

  // 3. Download Individual: Laboratório
  const handleDownloadLaboratorio = () => {
    const csv = exportLaboratorioToCSV(data.amostrasLaboratorio || []);
    downloadCsvFile(`laboratorio_analises_amostras_bc_${todayStr}`, csv);
    notifyDownloaded('laboratorio');
  };

  // 4. Download Individual: Pontos de Coleta
  const handleDownloadPontosColeta = () => {
    const csv = exportPontosColetaToCSV(data.pontosColeta || []);
    downloadCsvFile(`pontos_coleta_laboratorio_bc_${todayStr}`, csv);
    notifyDownloaded('pontos');
  };

  // 5. Download Individual: Pastas VISA
  const handleDownloadPastas = () => {
    const csv = exportPastasVisaToCSV(data.pastasVisa || []);
    downloadCsvFile(`pastas_arquivo_visa_bc_${todayStr}`, csv);
    notifyDownloaded('pastas');
  };

  // 6. Download Individual: Alvarás
  const handleDownloadAlvaras = () => {
    const csv = exportAlvarasToCSV(data.alvaras || []);
    downloadCsvFile(`alvaras_sanitarios_bc_${todayStr}`, csv);
    notifyDownloaded('alvaras');
  };

  // 7. Download Individual: Feirantes
  const handleDownloadFeiras = () => {
    const csv = exportFeirasToCSV(data.feiras || []);
    downloadCsvFile(`feirantes_ambulantes_bc_${todayStr}`, csv);
    notifyDownloaded('feiras');
  };

  // 8. Download Individual: Escala
  const handleDownloadEscala = () => {
    const csv = exportEscalaToCSV(data.escala || []);
    downloadCsvFile(`escala_trabalho_fiscais_bc_${todayStr}`, csv);
    notifyDownloaded('escala');
  };

  // 9. Download Individual: Operadores
  const handleDownloadUsers = () => {
    const csv = exportUsersToCSV(data.users || []);
    downloadCsvFile(`operadores_servidores_visa_bc_${todayStr}`, csv);
    notifyDownloaded('users');
  };

  // Download do Trio Principal (Fiscalizações + Processos + Laboratório)
  const handleDownloadTrioPrincipal = () => {
    handleDownloadFiscalizacoes();
    setTimeout(() => handleDownloadProcessos(), 300);
    setTimeout(() => handleDownloadLaboratorio(), 600);
    notifyDownloaded('trio');
  };

  // Download do Pacote ZIP Completo
  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const zipBlob = await generateBackupZip(data);
      const filename = `backup_completo_visa_bc_${todayStr}.zip`;
      downloadBlobFile(filename, zipBlob);
      notifyDownloaded('zip');
    } catch (err) {
      console.error('Erro ao gerar pacote ZIP de backup:', err);
      // Fallback: baixa os 3 CSVs
      handleDownloadTrioPrincipal();
    } finally {
      setDownloadingZip(false);
    }
  };

  // Download JSON Estruturado (Restauração)
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    downloadBlobFile(`backup_estruturado_visa_bc_${todayStr}.json`, blob);
    notifyDownloaded('json');
  };

  const totalFiscalizacoes = data.fiscalizacoes?.length || 0;
  const totalProcessos = data.processos?.length || 0;
  const totalLaboratorio = data.amostrasLaboratorio?.length || 0;
  const totalPontos = data.pontosColeta?.length || 0;
  const totalPastas = data.pastasVisa?.length || 0;
  const totalAlvaras = data.alvaras?.length || 0;
  const totalFeiras = data.feiras?.length || 0;
  const totalEscala = data.escala?.length || 0;
  const totalUsers = data.users?.length || 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* ========================================================= */}
        {/* CABEÇALHO DO MODAL                                        */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Segurança & Conformidade
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5 flex items-center gap-2">
                Central de Backup & Exportação CSV
              </h2>
              <p className="text-xs text-slate-300">
                Download local de todas as tabelas operacionais da Vigilância Sanitária (DVIS - Balneário Camboriú)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* CORPO DO MODAL COM SCROLL                                 */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
          
          {/* BANNER DE AÇÃO RÁPIDA / DOWNLOAD EM LOTE */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-blue-500/10 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                Backup Completo Instantâneo
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                Exportar Todas as Tabelas de uma só vez
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                Gera um arquivo compacto (.ZIP) contendo os arquivos CSV prontos para o Microsoft Excel e LibreOffice Calc, acompanhado de manifesto oficial de integridade.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                {downloadingZip ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando Pacote ZIP...
                  </>
                ) : downloadedKey === 'zip' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    Pacote ZIP Baixado!
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Baixar Pacote .ZIP (Todos os CSVs)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadTrioPrincipal}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase px-4 py-3 rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                title="Baixa diretamente os 3 arquivos CSV: Fiscalizações, Processos e Laboratório"
              >
                <Download className="w-4 h-4" />
                Baixar os 3 CSVs Principais
              </button>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="bg-slate-700 hover:bg-slate-800 active:scale-95 text-slate-200 font-black text-xs uppercase px-3 py-3 rounded-xl shadow transition cursor-pointer"
                title="Backup completo estruturado em JSON para restauração técnica"
              >
                <Database className="w-4 h-4" />
                Backup JSON
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 1: AS 3 TABELAS PRINCIPAIS SOLICITADAS             */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Tabelas Operacionais Centrais (Requisito Principal)
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                Padrão UTF-8 com BOM • Delimitador ';'
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* CARD 1: FISCALIZAÇÕES */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-emerald-500/30 hover:border-emerald-500 rounded-2xl p-4 transition shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      {totalFiscalizacoes} registros
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase mt-3 text-sm">
                    1. Fiscalizações & Vistorias
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Termos de fiscalização, inspeções in loco, infrações, medidas sanitárias, relatórios técnicos e checklists.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    fiscalizacoes.csv
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadFiscalizacoes}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    {downloadedKey === 'fiscalizacoes' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Baixado!
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Baixar CSV
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 2: PROCESSOS */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-blue-500/30 hover:border-blue-500 rounded-2xl p-4 transition shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                      {totalProcessos} processos
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase mt-3 text-sm">
                    2. Processos Administrativos
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Protocolos 1Doc, tramitações setoriais, pareceres técnicos, prazos legais, CNAE de risco e status de análise.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    processos.csv
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadProcessos}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    {downloadedKey === 'processos' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Baixado!
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Baixar CSV
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 3: LABORATÓRIO */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-cyan-500/30 hover:border-cyan-500 rounded-2xl p-4 transition shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                      <Microscope className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                      {totalLaboratorio} amostras
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase mt-3 text-sm">
                    3. Laboratório & Análises
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Amostras de água potável, parâmetros físico-químicos (pH, cloro, turbidez, flúor), microbiologia e laudos técnicos.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    laboratorio.csv
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadLaboratorio}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    {downloadedKey === 'laboratorio' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Baixado!
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Baixar CSV
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 2: TABELAS COMPLEMENTARES SUGERIDAS (SUGESTÕES)     */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Tabelas Complementares & Cadastros (Sugestões Adicionais de Segurança)
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                Arquivos individuais sob demanda
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Pontos de Coleta */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 truncate">Pontos de Coleta</p>
                    <p className="text-[10px] text-slate-500">{totalPontos} locais cadastrados</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadPontosColeta}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                >
                  CSV
                </button>
              </div>

              {/* Pastas VISA */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 truncate">Pastas Arquivo VISA</p>
                    <p className="text-[10px] text-slate-500">{totalPastas} pastas arquivadas</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadPastas}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                >
                  CSV
                </button>
              </div>

              {/* Alvarás Sanitários */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileSignature className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 truncate">Alvarás Sanitários</p>
                    <p className="text-[10px] text-slate-500">{totalAlvaras} licenças emitidas</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadAlvaras}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                >
                  CSV
                </button>
              </div>

              {/* Feirantes & Ambulantes */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 shrink-0">
                    <Tent className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 truncate">Feiras & Ambulantes</p>
                    <p className="text-[10px] text-slate-500">{totalFeiras} licenças ativas</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadFeiras}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                >
                  CSV
                </button>
              </div>

              {/* Escala de Servidores */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 truncate">Escala de Plantão</p>
                    <p className="text-[10px] text-slate-500">{totalEscala} plantões listados</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadEscala}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                >
                  CSV
                </button>
              </div>

              {/* Operadores do Sistema */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 truncate">Operadores / Fiscais</p>
                    <p className="text-[10px] text-slate-500">{totalUsers} cadastrados</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadUsers}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-[11px] px-2.5 py-1 rounded-md transition cursor-pointer shrink-0"
                >
                  CSV
                </button>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 3: SUGESTÕES & BOAS PRÁTICAS DE SEGURANÇA           */}
          {/* ========================================================= */}
          <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-black uppercase text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Sugestões e Recomendações de Segurança da Informação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Rotina Semanal de Backup:</strong> Baixe o arquivo <code>.ZIP</code> ao final de cada semana ou antes de grandes atualizações em lote.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Compatibilidade Excel Garantida:</strong> Os arquivos utilizam codificação <code>UTF-8 com BOM</code> e separador <code>;</code>, abrindo perfeitamente com acentuações no Excel e LibreOffice sem distorções.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Armazenamento Seguro:</strong> Salve uma cópia do backup compactado na rede institucional da Prefeitura (BC Drive ou pasta protegida da DVIS).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Backup JSON para Restauração:</strong> O arquivo <code>.JSON</code> contém a árvore de dados completa com IDs originais, ideal para restauração técnica em caso de pane.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RODAPÉ DO MODAL                                           */}
        {/* ========================================================= */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Divisão de Vigilância Sanitária e Ambiental • Balneário Camboriú - SC</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black text-xs uppercase transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
