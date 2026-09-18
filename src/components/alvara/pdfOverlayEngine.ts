import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { AlvaraSanitarioItem } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { BRASAO_BC_BASE64 } from './brasaoAsset';

export const PDF_MODELO_LOCAL_KEY = 'alvara_modelo_oficial_pdf_b64';
export const PDF_MODELO_SUPABASE_BUCKET = 'templates';
export const PDF_MODELO_SUPABASE_FILENAME = 'alvara_modelo_oficial.pdf.pdf';
export const PDF_MODELO_SUPABASE_PUBLIC_URL =
  'https://wcbzmpnvcjamlgljsksk.supabase.co/storage/v1/object/public/templates/alvara_modelo_oficial.pdf.pdf';

/**
 * Converte base64 para Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Formata datas ISO (YYYY-MM-DD) para DD/MM/YYYY
 */
export function formatBrDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

/**
 * Busca o arquivo PDF matriz do modelo oficial:
 * 1. Tenta baixar do Supabase Storage no bucket 'modelos/alvara_modelo_oficial.pdf'
 * 2. Tenta baixar via URL pública do Supabase
 * 3. Tenta baixar via URL customizada
 * 4. Tenta carregar do cache local no navegador
 */
export async function getOfficialPdfTemplateBytes(customUrl?: string): Promise<{ bytes: Uint8Array; source: 'supabase' | 'url' | 'cache' } | null> {
  // 1. Tenta download direto via URL pública exata do Supabase
  try {
    const publicUrl = customUrl || PDF_MODELO_SUPABASE_PUBLIC_URL;
    const res = await fetch(publicUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.length > 500) {
        return { bytes, source: customUrl ? 'url' : 'supabase' };
      }
    }
  } catch (err) {
    console.warn('[PDF Engine] Supabase public URL fetch:', err);
  }

  // 2. Tenta baixar do Supabase Storage via SDK
  try {
    const { data, error } = await supabase.storage
      .from(PDF_MODELO_SUPABASE_BUCKET)
      .download(PDF_MODELO_SUPABASE_FILENAME);

    if (!error && data) {
      const buffer = await data.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.length > 500) {
        return { bytes, source: 'supabase' };
      }
    }
  } catch (err) {
    console.warn('[PDF Engine] Supabase storage SDK download:', err);
  }

  // 3. Tenta do cache local no navegador (caso o servidor tenha feito upload prévio)
  try {
    const cachedB64 = localStorage.getItem(PDF_MODELO_LOCAL_KEY);
    if (cachedB64) {
      const bytes = base64ToBytes(cachedB64);
      if (bytes.length > 500) {
        return { bytes, source: 'cache' };
      }
    }
  } catch (err) {
    console.warn('[PDF Engine] Error reading localStorage template:', err);
  }

  return null;
}

/**
 * Preenche o PDF modelo fornecido com os dados do contribuinte
 */
export async function fillAlvaraPdf(
  templateBytes: Uint8Array | ArrayBuffer,
  alvara: AlvaraSanitarioItem
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cleanDoc = alvara.cnpj_cpf || 'Não informado';
  const razaoSocial = (alvara.razao_social || '').toUpperCase();
  const nomeFantasia = (alvara.nome_fantasia || '').toUpperCase();
  const numCompleto = (alvara.numero || 'S/N').toUpperCase();
  const enderecoCompleto = `${alvara.endereco || ''}, Nº ${numCompleto}${
    alvara.complemento ? ' - ' + alvara.complemento : ''
  }`.toUpperCase();
  const bairro = (alvara.bairro || '').toUpperCase();
  const cep = alvara.cep || '88330-000';
  const municipio = (alvara.municipio || 'BALNEÁRIO CAMBORIÚ').toUpperCase();
  const validadeStr = formatBrDate(alvara.validade) || '31/03/2027';
  const emissaoStr = formatBrDate(alvara.data_emissao) || formatBrDate(new Date().toISOString().split('T')[0]);
  const numAlvaraCompleto = alvara.numero_alvara || `ALV-${alvara.ano_exercicio || '2026'}/${alvara.pasta || '001'}`;
  const pastaStr = alvara.pasta || '';
  const cnaeStr = alvara.cnae_principal || '';
  const setorStr = (alvara.setor || 'GERAL').toUpperCase();
  const condicionantesStr = alvara.condicionantes || 'Licença sanitária concedida nos termos da legislação municipal vigente.';
  const authCode = alvara.codigo_autenticacao || `BC-VISA-${alvara.ano_exercicio || '2026'}-${Date.now().toString(36).toUpperCase()}`;

  // Se o PDF possuir Form Fields interativos, preenche por tag
  let filledAnyField = false;
  try {
    const fields = form.getFields();
    if (fields.length > 0) {
      for (const field of fields) {
        const fieldName = field.getName().toUpperCase();
        try {
          const tf = form.getTextField(field.getName());
          if (fieldName.includes('NOME') || fieldName.includes('RAZAO')) {
            tf.setText(razaoSocial);
            filledAnyField = true;
          } else if (fieldName.includes('DOC') || fieldName.includes('CNPJ') || fieldName.includes('CPF')) {
            tf.setText(cleanDoc);
            filledAnyField = true;
          } else if (fieldName.includes('NUMERO') || fieldName.includes('ALVARA')) {
            tf.setText(numAlvaraCompleto);
            filledAnyField = true;
          } else if (fieldName.includes('FANTASIA')) {
            tf.setText(nomeFantasia);
            filledAnyField = true;
          } else if (fieldName.includes('ENDERECO') || fieldName.includes('LOGRADOURO')) {
            tf.setText(enderecoCompleto);
            filledAnyField = true;
          } else if (fieldName.includes('BAIRRO')) {
            tf.setText(bairro);
            filledAnyField = true;
          } else if (fieldName.includes('CEP')) {
            tf.setText(cep);
            filledAnyField = true;
          } else if (fieldName.includes('VALIDADE')) {
            tf.setText(validadeStr);
            filledAnyField = true;
          } else if (fieldName.includes('EMISSAO')) {
            tf.setText(emissaoStr);
            filledAnyField = true;
          } else if (fieldName.includes('CNAE') || fieldName.includes('ATIVIDADE')) {
            tf.setText(cnaeStr);
            filledAnyField = true;
          } else if (fieldName.includes('PASTA')) {
            tf.setText(pastaStr);
            filledAnyField = true;
          } else if (fieldName.includes('SETOR')) {
            tf.setText(setorStr);
            filledAnyField = true;
          }
        } catch {
          // Field not a textfield
        }
      }
    }
  } catch (err) {
    console.warn('[PDF Form Fields]', err);
  }

  // Carimbo posicional com máscara anti-sobreposição e proporção milimétrica sobre a página A4
  if (!filledAnyField) {
    const scaleX = width / 595.28;
    const scaleY = height / 841.89;

    // Máscaras de limpeza (Whiteout) para apagar os dados de exemplo do modelo estático
    const drawMask = (x: number, y: number, w: number, h: number) => {
      firstPage.drawRectangle({
        x: x * scaleX,
        y: y * scaleY,
        width: w * scaleX,
        height: h * scaleY,
        color: rgb(1, 1, 1),
      });
    };

    // 1. Limpa área de número e validade no cabeçalho da tabela
    drawMask(440, 841.89 - 138, 115, 20);
    firstPage.drawText(numAlvaraCompleto, {
      x: 165 * scaleX,
      y: (841.89 - 134) * scaleY,
      size: 10.5 * scaleX,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // 2. Limpa e substitui Razão Social e CPF/CNPJ
    drawMask(42, 841.89 - 188, 350, 20);
    drawMask(395, 841.89 - 188, 160, 20);
    firstPage.drawText(razaoSocial.substring(0, 58), {
      x: 44 * scaleX,
      y: (841.89 - 182) * scaleY,
      size: 9.5 * scaleX,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(cleanDoc, {
      x: 400 * scaleX,
      y: (841.89 - 182) * scaleY,
      size: 9.5 * scaleX,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // 3. Limpa e substitui Nome Fantasia
    drawMask(42, 841.89 - 216, 513, 20);
    if (nomeFantasia) {
      firstPage.drawText(nomeFantasia.substring(0, 68), {
        x: 44 * scaleX,
        y: (841.89 - 210) * scaleY,
        size: 9 * scaleX,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // 4. Limpa e substitui Endereço e Número
    drawMask(42, 841.89 - 244, 350, 20);
    drawMask(395, 841.89 - 244, 160, 20);
    firstPage.drawText(enderecoCompleto.substring(0, 60), {
      x: 44 * scaleX,
      y: (841.89 - 238) * scaleY,
      size: 9 * scaleX,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(numCompleto.substring(0, 25), {
      x: 400 * scaleX,
      y: (841.89 - 238) * scaleY,
      size: 9 * scaleX,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    // 5. Limpa e substitui Bairro, CEP e Município
    drawMask(42, 841.89 - 272, 200, 20);
    drawMask(245, 841.89 - 272, 145, 20);
    firstPage.drawText(bairro.substring(0, 35), {
      x: 44 * scaleX,
      y: (841.89 - 266) * scaleY,
      size: 9 * scaleX,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(cep.substring(0, 20), {
      x: 250 * scaleX,
      y: (841.89 - 266) * scaleY,
      size: 9 * scaleX,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    // 6. Limpa e substitui Observações / Condicionantes
    drawMask(42, 841.89 - 395, 513, 26);
    firstPage.drawText(condicionantesStr.substring(0, 95), {
      x: 44 * scaleX,
      y: (841.89 - 388) * scaleY,
      size: 8 * scaleX,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    // 7. Limpa e substitui Datas (Início, Emissão, Validade)
    drawMask(42, 841.89 - 422, 165, 20);
    drawMask(210, 841.89 - 422, 165, 20);
    drawMask(380, 841.89 - 422, 175, 20);
    firstPage.drawText(emissaoStr, {
      x: 44 * scaleX,
      y: (841.89 - 416) * scaleY,
      size: 9.5 * scaleX,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(emissaoStr, {
      x: 216 * scaleX,
      y: (841.89 - 416) * scaleY,
      size: 9.5 * scaleX,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    firstPage.drawText(validadeStr, {
      x: 390 * scaleX,
      y: (841.89 - 416) * scaleY,
      size: 10 * scaleX,
      font: fontBold,
      color: rgb(0.75, 0.1, 0.1),
    });

    // 8. Limpa e substitui CNAE / Atividade (uma embaixo da outra com fonte 8)
    drawMask(42, 841.89 - 485, 513, 40);
    const cnaeLines = cnaeStr.split('\n').map((s) => s.trim()).filter(Boolean);
    if (cnaeLines.length > 0) {
      let currentCnaeY = (841.89 - 462) * scaleY;
      const maxLinesToDraw = Math.min(cnaeLines.length, 3);
      for (let i = 0; i < maxLinesToDraw; i++) {
        firstPage.drawText(`• ${cnaeLines[i].substring(0, 95)}`, {
          x: 44 * scaleX,
          y: currentCnaeY,
          size: 8 * scaleX,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        currentCnaeY -= 11 * scaleY;
      }
    }

    // Carimbo Digital e Autenticação no Rodapé
    const carimboMsg = `VALIDADO DIGITALMENTE PELA VIGILÂNCIA SANITÁRIA DE BALNEÁRIO CAMBORIÚ • CHAVE: ${authCode}`;
    firstPage.drawText(carimboMsg, {
      x: 44 * scaleX,
      y: 78 * scaleY,
      size: 6.8 * scaleX,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  return await pdfDoc.save();
}

/**
 * Helper para quebrar texto em linhas respeitando limite de caracteres
 */
function wrapTextToLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxCharsPerLine) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Helper avançado para quebrar texto em linhas respeitando a largura exata em pontos (pixels) da fonte PDF
 */
function wrapTextByWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';

  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Cria do zero o PDF Oficial Vetorial da Vigilância Sanitária de Balneário Camboriú:
 * - Estética 100% idêntica ao documento oficial (Google Docs / Decreto Municipal)
 * - Substitui TODOS os dados reais do contribuinte (sem dados estáticos de exemplo)
 * - Zero sobreposição de textos
 * - Ajuste dinâmico e automático de espaço para CNAEs com fonte tamanho 8 (frase legal)
 */
export async function createDefaultOfficialAlvaraPdf(alvara: AlvaraSanitarioItem): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Folha A4 padrão (595.28 x 841.89 pt)
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Incorporar Brasão Oficial de Balneário Camboriú
  let brasaoImage = null;
  try {
    const brasaoBytes = base64ToBytes(BRASAO_BC_BASE64);
    brasaoImage = await pdfDoc.embedPng(brasaoBytes);
  } catch (err) {
    console.warn('[PDF Engine] Could not embed brasao png:', err);
  }

  // 2. Marca D'água sutil no centro da página
  if (brasaoImage) {
    page.drawImage(brasaoImage, {
      x: (width - 240) / 2,
      y: (height - 300) / 2,
      width: 240,
      height: 300,
      opacity: 0.05,
    });
  }

  // 3. Cabeçalho Oficial Idêntico ao Modelo de Balneário Camboriú
  if (brasaoImage) {
    page.drawImage(brasaoImage, {
      x: 38,
      y: height - 102,
      width: 54,
      height: 66,
    });
  }

  page.drawText('ESTADO DE SANTA CATARINA', {
    x: 104,
    y: height - 50,
    size: 10.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText('MUNICÍPIO DE BALNEÁRIO CAMBORIÚ', {
    x: 104,
    y: height - 66,
    size: 13.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText('SECRETARIA DE SAÚDE E SANEAMENTO', {
    x: 104,
    y: height - 80,
    size: 9.5,
    font: fontBold,
    color: rgb(0.12, 0.16, 0.23),
  });

  page.drawText('DIVISÃO DE VIGILÂNCIA SANITÁRIA', {
    x: 104,
    y: height - 94,
    size: 12.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Linha divisória horizontal abaixo do cabeçalho
  page.drawLine({
    start: { x: 36, y: height - 106 },
    end: { x: width - 36, y: height - 106 },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });

  // Coordenadas da Tabela Oficial Integrada (Modelo Google Docs)
  const tableX = 36;
  const tableW = width - 72; // 523.28 pt
  let curY = height - 114;

  const borderColor = rgb(0, 0, 0);
  const borderWidth = 1;
  const labelColor = rgb(0.25, 0.25, 0.25);
  const textColor = rgb(0, 0, 0);

  // Dados formatados
  const pastaOuNumero = alvara.pasta || alvara.numero_alvara || '001';
  const anoExercicio = alvara.ano_exercicio || '2026';
  const razaoSocial = (alvara.razao_social || 'NÃO INFORMADO').toUpperCase();
  const cnpjCpf = (alvara.cnpj_cpf || 'NÃO INFORMADO').trim();
  const nomeFantasia = (alvara.nome_fantasia || alvara.razao_social || 'NÃO INFORMADO').toUpperCase();
  const endereco = (alvara.endereco || 'NÃO INFORMADO').toUpperCase();
  const numCompleto = [alvara.numero, alvara.complemento].filter(Boolean).join(' / ').toUpperCase() || 'S/N';
  const bairro = (alvara.bairro || 'CENTRO').toUpperCase();
  const cep = (alvara.cep || '88330-000').trim();
  const dataInicio = formatBrDate(alvara.data_emissao) || `01/01/${anoExercicio}`;
  const dataEmissao = formatBrDate(alvara.data_emissao) || formatBrDate(new Date().toISOString().split('T')[0]);
  const dataValidade = formatBrDate(alvara.validade) || `31/12/${anoExercicio}`;
  const grauRisco = (alvara.grau_risco || 'BAIXO GRAU DE RISCO SANITÁRIO').toUpperCase();
  const condicionantes = (alvara.condicionantes || 'Manter o Alvará Sanitário fixado em local visível ao público.').toUpperCase();
  const authCode = alvara.codigo_autenticacao || `BC-VISA-${anoExercicio}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const fiscal = (alvara.fiscal_emissor || 'Autoridade Sanitária DVIS').toUpperCase();

  // Linha 1: Cabeçalho da Tabela (ALVARÁ SANITÁRIO | Nº PASTA / ANO)
  const h1 = 24;
  page.drawRectangle({
    x: tableX,
    y: curY - h1,
    width: tableW,
    height: h1,
    borderColor,
    borderWidth,
    color: rgb(0.91, 0.93, 0.96),
  });
  const split1 = tableX + tableW * 0.68;
  page.drawLine({
    start: { x: split1, y: curY },
    end: { x: split1, y: curY - h1 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawText('ALVARÁ SANITÁRIO', {
    x: tableX + 115,
    y: curY - 17,
    size: 12.5,
    font: fontBold,
    color: textColor,
  });
  page.drawText(`Nº   ${pastaOuNumero} /${anoExercicio}`, {
    x: split1 + 32,
    y: curY - 17,
    size: 11,
    font: fontBold,
    color: textColor,
  });
  curY -= h1;

  // Linha 2: NOME DA PESSOA FÍSICA E/OU JURÍDICA | CPF / CNPJ
  const maxRazaoWidth = split1 - tableX - 14;
  const razaoLines = wrapTextByWidth(razaoSocial, fontBold, 9.0, maxRazaoWidth);
  const h2 = Math.max(30, 14 + razaoLines.length * 11 + 4);
  page.drawRectangle({
    x: tableX,
    y: curY - h2,
    width: tableW,
    height: h2,
    borderColor,
    borderWidth,
  });
  page.drawLine({
    start: { x: split1, y: curY },
    end: { x: split1, y: curY - h2 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawText('NOME DA PESSOA FÍSICA E/OU JURÍDICA', {
    x: tableX + 6,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  let rY = curY - 21;
  for (const rLine of razaoLines) {
    page.drawText(rLine, {
      x: tableX + 6,
      y: rY,
      size: 9.0,
      font: fontBold,
      color: textColor,
    });
    rY -= 11;
  }
  page.drawText('CPF / CNPJ', {
    x: split1 + 8,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(cnpjCpf, {
    x: split1 + 8,
    y: curY - 22,
    size: 9.5,
    font: fontBold,
    color: textColor,
  });
  curY -= h2;

  // Linha 3: DENOMINAÇÃO COMERCIAL/NOME FANTASIA
  const maxFantasiaWidth = tableW - 14;
  const fantasiaLines = wrapTextByWidth(nomeFantasia, fontBold, 9.0, maxFantasiaWidth);
  const h3 = Math.max(28, 14 + fantasiaLines.length * 11 + 4);
  page.drawRectangle({
    x: tableX,
    y: curY - h3,
    width: tableW,
    height: h3,
    borderColor,
    borderWidth,
  });
  page.drawText('DENOMINAÇÃO COMERCIAL/NOME FANTASIA', {
    x: tableX + 6,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  let fY = curY - 21;
  for (const fLine of fantasiaLines) {
    page.drawText(fLine, {
      x: tableX + 6,
      y: fY,
      size: 9.0,
      font: fontBold,
      color: textColor,
    });
    fY -= 11;
  }
  curY -= h3;

  // Linha 4: ENDEREÇO | Nº / COMPLEMENTO/ SALA
  const maxEnderecoWidth = split1 - tableX - 14;
  const enderecoLines = wrapTextByWidth(endereco, fontRegular, 8.5, maxEnderecoWidth);
  const h4 = Math.max(28, 14 + enderecoLines.length * 10 + 4);
  page.drawRectangle({
    x: tableX,
    y: curY - h4,
    width: tableW,
    height: h4,
    borderColor,
    borderWidth,
  });
  page.drawLine({
    start: { x: split1, y: curY },
    end: { x: split1, y: curY - h4 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawText('ENDEREÇO', {
    x: tableX + 6,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  let eY = curY - 21;
  for (const eLine of enderecoLines) {
    page.drawText(eLine, {
      x: tableX + 6,
      y: eY,
      size: 8.5,
      font: fontRegular,
      color: textColor,
    });
    eY -= 10;
  }
  page.drawText('Nº / COMPLEMENTO/ SALA', {
    x: split1 + 8,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(numCompleto.substring(0, 30), {
    x: split1 + 8,
    y: curY - 22,
    size: 9,
    font: fontRegular,
    color: textColor,
  });
  curY -= h4;

  // Linha 5: BAIRRO | CEP | MUNICÍPIO / ESTADO
  const h5 = 28;
  page.drawRectangle({
    x: tableX,
    y: curY - h5,
    width: tableW,
    height: h5,
    borderColor,
    borderWidth,
  });
  const split5_1 = tableX + tableW * 0.4;
  const split5_2 = tableX + tableW * 0.68;
  page.drawLine({
    start: { x: split5_1, y: curY },
    end: { x: split5_1, y: curY - h5 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawLine({
    start: { x: split5_2, y: curY },
    end: { x: split5_2, y: curY - h5 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawText('BAIRRO', {
    x: tableX + 6,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(bairro.substring(0, 32), {
    x: tableX + 6,
    y: curY - 22,
    size: 9,
    font: fontRegular,
    color: textColor,
  });
  page.drawText('CEP', {
    x: split5_1 + 8,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(cep, {
    x: split5_1 + 8,
    y: curY - 22,
    size: 9,
    font: fontRegular,
    color: textColor,
  });
  page.drawText('MUNICÍPIO / ESTADO', {
    x: split5_2 + 8,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText('BALNEÁRIO CAMBORIÚ/SC.', {
    x: split5_2 + 8,
    y: curY - 22,
    size: 9,
    font: fontBold,
    color: textColor,
  });
  curY -= h5;

  // Linha 6: CIÊNCIA (Texto Jurídico Oficial do Município - Ajuste 100% Dinâmico de Espaço)
  const cienciaParagrafos = [
    'Alvará Sanitário expedido com fundamento na Lei Complementar nº 40/2019, que institui o Código Sanitário Municipal; na Lei Municipal nº 4.999/2025, que institui e integra as taxas ao Sistema Tributário Municipal, na Lei Complementar nº 125/2025, que institui a Declaração de Direitos da Liberdade Econômica Municipal e no Decreto Municipal nº 12.965/2026, que regulamenta o enquadramento das atividades econômicas em baixo, médio e alto risco locacional.',
    'O presente documento autorizativo possui validade anual, tendo sua eficácia renovada mediante quitação da Taxa de Vigilância Sanitária (TVS) do exercício correspondente, salvo as hipóteses de isenção previstas em lei.',
    'A expedição do Alvará Sanitário implica a ciência do exposto na Declaração de Compromisso Sanitário, por meio do qual o responsável se compromete a manter suas atividades dentro das normas sanitárias aplicáveis e a receber as inspeções sanitárias a qualquer tempo, inclusive em imóvel residencial, quando for o caso.',
    'O descumprimento das normas sanitárias, de qualquer natureza, é classificado como infração sanitária e sujeita o infrator às penalidades previstas em lei, sem prejuízo das sanções penal e administrativas cabíveis.'
  ];

  const cienciaFontSize = 6.1;
  const cienciaLineHeight = 7.5;
  const cienciaParagraphGap = 2.5;
  const cienciaMaxWidth = tableW - 14;

  const cienciaParasWithLines = cienciaParagrafos.map((p) =>
    wrapTextByWidth(p, fontRegular, cienciaFontSize, cienciaMaxWidth)
  );
  const totalCienciaLines = cienciaParasWithLines.reduce((acc, lines) => acc + lines.length, 0);
  const totalCienciaTextHeight =
    totalCienciaLines * cienciaLineHeight + (cienciaParagrafos.length - 1) * cienciaParagraphGap;
  const h6 = Math.max(76, 16 + totalCienciaTextHeight + 6);

  page.drawRectangle({
    x: tableX,
    y: curY - h6,
    width: tableW,
    height: h6,
    borderColor,
    borderWidth,
  });
  page.drawText('CIÊNCIA:', {
    x: tableX + 6,
    y: curY - 9.5,
    size: 6.8,
    font: fontBold,
    color: textColor,
  });

  let cY = curY - 18;
  for (let pIdx = 0; pIdx < cienciaParasWithLines.length; pIdx++) {
    const lines = cienciaParasWithLines[pIdx];
    for (const l of lines) {
      page.drawText(l, {
        x: tableX + 6,
        y: cY,
        size: cienciaFontSize,
        font: fontRegular,
        color: rgb(0.12, 0.12, 0.12),
      });
      cY -= cienciaLineHeight;
    }
    if (pIdx < cienciaParasWithLines.length - 1) {
      cY -= cienciaParagraphGap;
    }
  }
  curY -= h6;

  // Linha 7: AUTORIDADE DE VIGILÂNCIA SANITÁRIA/ OBSERVAÇÕES (Ajuste Dinâmico sem Sobreposição)
  const obsFontSize = 8;
  const obsLineHeight = 10.5;
  const obsMaxWidth = tableW - 14;
  const obsLines = wrapTextByWidth(condicionantes, fontBold, obsFontSize, obsMaxWidth);
  const obsTotalHeight = obsLines.length * obsLineHeight;
  const h7 = Math.max(38, 14 + obsTotalHeight + 15 + 4);

  page.drawRectangle({
    x: tableX,
    y: curY - h7,
    width: tableW,
    height: h7,
    borderColor,
    borderWidth,
  });
  page.drawText('AUTORIDADE DE VIGILÂNCIA SANITÁRIA/ OBSERVAÇÕES (Pode ser assinado Digitalmente)', {
    x: tableX + 6,
    y: curY - 9.5,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });

  let obsY = curY - 20;
  for (const line of obsLines) {
    page.drawText(line, {
      x: tableX + 6,
      y: obsY,
      size: obsFontSize,
      font: fontBold,
      color: textColor,
    });
    obsY -= obsLineHeight;
  }

  page.drawText(`Autenticação Digital: ${authCode} • Fiscal Emissor: ${fiscal}`, {
    x: tableX + 6,
    y: curY - h7 + 5,
    size: 6.8,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  curY -= h7;

  // Linha 8: INÍCIO DA ATIVIDADE | EMISSÃO | VALIDADE
  const h8 = 28;
  page.drawRectangle({
    x: tableX,
    y: curY - h8,
    width: tableW,
    height: h8,
    borderColor,
    borderWidth,
  });
  const split8_1 = tableX + tableW * 0.33;
  const split8_2 = tableX + tableW * 0.66;
  page.drawLine({
    start: { x: split8_1, y: curY },
    end: { x: split8_1, y: curY - h8 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawLine({
    start: { x: split8_2, y: curY },
    end: { x: split8_2, y: curY - h8 },
    thickness: borderWidth,
    color: borderColor,
  });
  page.drawText('INÍCIO DA ATIVIDADE', {
    x: tableX + 6,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(dataInicio, {
    x: tableX + 6,
    y: curY - 22,
    size: 9.5,
    font: fontBold,
    color: textColor,
  });
  page.drawText('EMISSÃO', {
    x: split8_1 + 8,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(dataEmissao, {
    x: split8_1 + 8,
    y: curY - 22,
    size: 9.5,
    font: fontBold,
    color: textColor,
  });
  page.drawText('VALIDADE', {
    x: split8_2 + 8,
    y: curY - 10,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(dataValidade, {
    x: split8_2 + 8,
    y: curY - 22,
    size: 10.5,
    font: fontBold,
    color: rgb(0.75, 0.1, 0.1),
  });
  curY -= h8;

  // Linha 9: CLASSIFICAÇÃO DE RISCO
  const h9 = 24;
  page.drawRectangle({
    x: tableX,
    y: curY - h9,
    width: tableW,
    height: h9,
    borderColor,
    borderWidth,
  });
  page.drawText('CLASSIFICAÇÃO DE RISCO', {
    x: tableX + 6,
    y: curY - 9,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });
  page.drawText(grauRisco, {
    x: tableX + 6,
    y: curY - 19,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.18, 0.32),
  });
  curY -= h9;

  // Linha 10: CÓD. CNAE / DESCRIÇÃO / RISCO SANITÁRIO (com ajuste automático e uma embaixo da outra)
  const cnaeRaw = alvara.cnae_principal || 'SERVIÇOS / COMÉRCIO EM GERAL';
  const cnaeItems = cnaeRaw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (cnaeItems.length === 0) cnaeItems.push('SERVIÇOS / COMÉRCIO EM GERAL');

  // Fonte tamanho 8 (baseada na frase legal conforme solicitação do usuário)
  const cnaeFontSize = 8;
  const cnaeLineHeight = 11;
  const cnaeMaxWidth = tableW - 14;
  const cnaeWrappedList: { text: string; isFirst: boolean }[] = [];

  for (const item of cnaeItems) {
    const wrapped = wrapTextByWidth(item.toUpperCase(), fontBold, cnaeFontSize, cnaeMaxWidth - 8);
    wrapped.forEach((w, idx) => {
      cnaeWrappedList.push({
        text: idx === 0 && cnaeItems.length > 1 ? `• ${w}` : (idx > 0 ? `  ${w}` : w),
        isFirst: idx === 0,
      });
    });
  }

  const h10 = Math.max(34, 15 + cnaeWrappedList.length * cnaeLineHeight + 6);

  page.drawRectangle({
    x: tableX,
    y: curY - h10,
    width: tableW,
    height: h10,
    borderColor,
    borderWidth,
  });
  page.drawText('CÓD. CNAE / DESCRIÇÃO / RISCO SANITÁRIO', {
    x: tableX + 6,
    y: curY - 9.5,
    size: 6.8,
    font: fontBold,
    color: labelColor,
  });

  let cnaeY = curY - 21;
  for (const row of cnaeWrappedList) {
    page.drawText(row.text, {
      x: tableX + 6,
      y: cnaeY,
      size: cnaeFontSize,
      font: fontBold,
      color: textColor,
    });
    cnaeY -= cnaeLineHeight;
  }
  curY -= h10;

  // Rodapé Oficial Idêntico ao Modelo de Balneário Camboriú
  const footerTitle = 'MANTER EM LOCAL VISÍVEL AO PÚBLICO';
  const footerTitleWidth = fontBold.widthOfTextAtSize(footerTitle, 12.5);
  page.drawText(footerTitle, {
    x: (width - footerTitleWidth) / 2,
    y: 68,
    size: 12.5,
    font: fontBold,
    color: textColor,
  });

  const footerDept = 'DIVISÃO DE VIGILÂNCIA SANITÁRIA';
  const footerDeptWidth = fontBold.widthOfTextAtSize(footerDept, 9);
  page.drawText(footerDept, {
    x: (width - footerDeptWidth) / 2,
    y: 53,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const footerAddr = 'Avenida Palestina, Nº 150 - Nações - CEP 88338-010 - Tel: (47) 3267-7000';
  const footerAddrWidth = fontRegular.widthOfTextAtSize(footerAddr, 7.5);
  page.drawText(footerAddr, {
    x: (width - footerAddrWidth) / 2,
    y: 41,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  const footerWeb = 'E-mail: devs@bc.sc.gov.br • Portal: www.bc.sc.gov.br';
  const footerWebWidth = fontRegular.widthOfTextAtSize(footerWeb, 7.5);
  page.drawText(footerWeb, {
    x: (width - footerWebWidth) / 2,
    y: 30,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  return await pdfDoc.save();
}

/**
 * Gera o PDF Completo e Inteligente:
 * - Modelo Vetorial Oficial: desenha a estética 100% idêntica do município com dados dinâmicos e sem sobreposição
 * - Modelo Supabase: se solicitado, aplica os dados com máscara anti-sobreposição sobre o PDF estático
 */
export async function generateCompleteAlvaraPdf(
  alvara: AlvaraSanitarioItem,
  customBytes?: Uint8Array | null,
  preferredModel: 'supabase' | 'vector' | 'auto' = 'auto'
): Promise<{ pdfBytes: Uint8Array; source: 'supabase' | 'url' | 'custom' | 'cache' | 'vector' }> {
  // 1. Se foi passado bytes explicitamente (upload temporário)
  if (customBytes && customBytes.length > 500) {
    try {
      const filled = await fillAlvaraPdf(customBytes, alvara);
      return { pdfBytes: filled, source: 'custom' };
    } catch (err) {
      console.warn('[PDF Engine] Error filling customBytes:', err);
    }
  }

  // 2. Se o usuário selecionou explicitamente a matriz estática do Supabase Storage
  if (preferredModel === 'supabase') {
    const officialTemplate = await getOfficialPdfTemplateBytes();
    if (officialTemplate && officialTemplate.bytes.length > 500) {
      try {
        const filled = await fillAlvaraPdf(officialTemplate.bytes, alvara);
        return { pdfBytes: filled, source: officialTemplate.source };
      } catch (err) {
        console.warn('[PDF Engine] Error filling template from ' + officialTemplate.source, err);
      }
    }
  }

  // 3. Padrão: PDF Oficial de Balneário Camboriú (Estética Oficial, dados 100% dinâmicos, zero sobreposição)
  const vectorBytes = await createDefaultOfficialAlvaraPdf(alvara);
  return { pdfBytes: vectorBytes, source: 'vector' };
}

/**
 * Salva o modelo PDF no Supabase Storage e também no cache local
 */
export async function uploadOfficialPdfTemplate(file: File): Promise<{ success: boolean; message: string; bytes?: Uint8Array }> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Salva no cache local em Base64
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    localStorage.setItem(PDF_MODELO_LOCAL_KEY, base64);

    // 2. Tenta enviar para o Supabase Storage
    const { error } = await supabase.storage
      .from(PDF_MODELO_SUPABASE_BUCKET)
      .upload(PDF_MODELO_SUPABASE_FILENAME, file, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (error) {
      console.warn('[Upload PDF Supabase Warning]:', error.message);
      return {
        success: true,
        message: 'Modelo PDF salvo e ativado no navegador! (No Supabase: ' + error.message + ')',
        bytes,
      };
    }

    return {
      success: true,
      message: 'Modelo PDF oficial enviado e ativado com sucesso no Supabase Storage (modelos/alvara_modelo_oficial.pdf)!',
      bytes,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro ao processar o arquivo PDF.',
    };
  }
}
