// ============================================================================
// SASI · exportPDF — gera PDF "Passagem de Turno" (A4 paisagem).
// Usa jspdf + jspdf-autotable pra tabela densa com todos os leitos ativos.
// ============================================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DashboardRow } from './supabaseClient';

function getPlantao(): string {
  const h = new Date().getHours();
  if (h >= 7 && h < 13) return 'MANHÃ';
  if (h >= 13 && h < 19) return 'TARDE';
  return 'NOITE';
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return '—';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export function exportPassagemTurno(
  patients: DashboardRow[],
  userEmail?: string
) {
  const now = new Date();
  const plantao = getPlantao();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // A4 landscape
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SASI — Passagem de Turno', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr}  ${timeStr}  ·  Plantão ${plantao}`, 14, 20);
  if (userEmail) {
    doc.text(`Responsável: ${userEmail}`, 14, 25);
  }

  // ── Tabela ──────────────────────────────────────────────────────────────
  const head = [['UTI', 'Leito', 'Nome', 'SOFA', 'Δ', 'Grav.', 'DVA', 'Sed', 'Pend', 'Dias', 'HD']];

  const body = patients.map((p) => {
    const delta = p.delta_sofa_24h ?? 0;
    const deltaStr = delta > 0 ? `+${delta}` : String(delta);
    const dvaCount = Array.isArray(p.dvas) ? p.dvas.length : 0;
    const sedCount = Array.isArray(p.sedativos) ? p.sedativos.length : 0;
    return [
      p.uti,
      p.leito,
      truncate(p.nome, 30),
      p.sofa_total ?? '—',
      deltaStr,
      p.gravidade,
      dvaCount > 0 ? `${dvaCount}` : '—',
      sedCount > 0 ? `${sedCount}` : '—',
      p.pendencias_abertas > 0 ? String(p.pendencias_abertas) : '—',
      `D${p.dias_internacao}`,
      truncate(p.hd, 80),
    ];
  });

  autoTable(doc, {
    startY: userEmail ? 29 : 24,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 12 },  // UTI
      1: { cellWidth: 12 },  // Leito
      2: { cellWidth: 35 },  // Nome
      3: { cellWidth: 10, halign: 'center' },  // SOFA
      4: { cellWidth: 8, halign: 'center' },   // Δ
      5: { cellWidth: 16 },  // Gravidade
      6: { cellWidth: 8, halign: 'center' },   // DVA
      7: { cellWidth: 8, halign: 'center' },   // Sed
      8: { cellWidth: 10, halign: 'center' },  // Pend
      9: { cellWidth: 12 },  // Dias
      10: { cellWidth: 'auto' }, // HD
    },
    didParseCell(data) {
      // Colore gravidade
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw);
        if (val === 'critico') {
          data.cell.styles.textColor = [239, 68, 68]; // red-500
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'grave') {
          data.cell.styles.textColor = [249, 115, 22]; // orange-500
        }
      }
      // Colore SOFA alto
      if (data.section === 'body' && data.column.index === 3) {
        const val = Number(data.cell.raw);
        if (val >= 11) {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        } else if (val >= 7) {
          data.cell.styles.textColor = [249, 115, 22];
        }
      }
      // Colore delta positivo
      if (data.section === 'body' && data.column.index === 4) {
        const raw = String(data.cell.raw);
        if (raw.startsWith('+')) {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  // ── Footer ──────────────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `SASI v1.0 · Gerado em ${dateStr} ${timeStr} · LGPD art. 46 · Documento interno`,
    14,
    pageHeight - 6
  );

  // ── Save ────────────────────────────────────────────────────────────────
  const ts = now.toISOString().replace(/[:.]/g, '').slice(0, 13);
  doc.save(`SASI_passagem_${ts}.pdf`);
}
