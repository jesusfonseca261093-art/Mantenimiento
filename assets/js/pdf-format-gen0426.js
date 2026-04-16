(() => {
  const LOGO_CANDIDATES = [
    "assets/img/Gen.png",
    "assets/img/gen.png",
    "img/Gen.png",
    "img/gen.png",
    "Gen.png",
    "gen.png",
  ];
  let cachedLogoDataUrl = null;

  const STYLE = {
    page: { w: 210, h: 297, margin: 8, border: 0.45, color: [0, 0, 0] },
    header: { y: 8, h: 32, logoW: 36, metaW: 42 },
    font: { family: "helvetica", sm: 8, md: 9.5, lg: 11.5, xl: 13 },
  };

  function safeName(text) {
    return String(text || "registro").replace(/[^\w\-]+/g, "_").slice(0, 50);
  }

  function loadImageDataUrl(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  async function preloadLogo() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;
    for (const candidate of LOGO_CANDIDATES) {
      try {
        cachedLogoDataUrl = await loadImageDataUrl(candidate);
        return cachedLogoDataUrl;
      } catch (_) {
        // try next path
      }
    }
    return null;
  }

  function setBase(doc) {
    doc.setFont(STYLE.font.family, "normal");
    doc.setDrawColor(...STYLE.page.color);
    doc.setTextColor(...STYLE.page.color);
    doc.setLineWidth(STYLE.page.border);
  }

  function drawField(doc, label, value, x, y, width) {
    doc.setFont(STYLE.font.family, "bold");
    doc.text(label, x, y);
    const labelWidth = doc.getTextWidth(label);
    const startX = Math.min(x + labelWidth + 2, width - 8);
    doc.setFont(STYLE.font.family, "normal");
    doc.text(String(value || "-"), startX + 1, y);
    doc.line(startX, y + 1, width, y + 1);
  }

  function checkbox(doc, x, y, checked) {
    doc.rect(x, y, 4.6, 4.6);
    if (checked) {
      doc.line(x + 0.8, y + 2.4, x + 2, y + 3.8);
      doc.line(x + 2, y + 3.8, x + 3.9, y + 1);
    }
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function parseType(estado) {
    const s = normalizeText(estado);
    return {
      preventivo: s.includes("preventivo"),
      predictivo: s.includes("predictivo") || s.includes("revision"),
      correctivo: s.includes("correctivo"),
      modificacion: s.includes("modific") || s.includes("mejora"),
      alta: s.includes("alta") && s.includes("activo"),
    };
  }
  function splitPiecesV2(record) {
    const parts = String(record.pieza || "")
      .split(/[;,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const rows = (parts.length ? parts : ["Sin pieza especificada"]).slice(0, 5);
    return rows.map((p, i) => {
      const match = p.match(/\(x\s*(\d+)\)$/i);
      if (match) {
        const qty = Number(match[1]) || 1;
        const name = p.replace(/\(x\s*\d+\)$/i, "").trim();
        return `${i + 1}. ${name} ${qty} pz`;
      }
      return `${i + 1}. ${p}`;
    });
  }

  function drawHeader(doc, record, logoDataUrl) {
    const x = STYLE.page.margin;
    const y = STYLE.header.y;
    const w = STYLE.page.w - x * 2;
    const h = STYLE.header.h;
    const centerW = w - STYLE.header.logoW - STYLE.header.metaW;
    const metaX = x + STYLE.header.logoW + centerW;

    doc.rect(x, y, w, h);
    doc.line(x + STYLE.header.logoW, y, x + STYLE.header.logoW, y + h);
    doc.line(metaX, y, metaX, y + h);

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", x + 4, y + 4, 28, 24);
      } catch (_) {
        // fallback text logo
        doc.setFontSize(STYLE.font.md);
        doc.setFont(STYLE.font.family, "bold");
        doc.text("GAS EXPRESS", x + 8, y + 12);
        doc.text("NIETO", x + 8, y + 18);
        doc.setFont(STYLE.font.family, "normal");
        doc.setFontSize(STYLE.font.sm);
        doc.text("EMPRESA S.A. DE C.V.", x + 8, y + 24);
      }
    } else {
      doc.setFontSize(STYLE.font.md);
      doc.setFont(STYLE.font.family, "bold");
      doc.text("GAS EXPRESS", x + 8, y + 12);
      doc.text("NIETO", x + 8, y + 18);
      doc.setFont(STYLE.font.family, "normal");
      doc.setFontSize(STYLE.font.sm);
      doc.text("EMPRESA S.A. DE C.V.", x + 8, y + 24);
    }

    doc.setFontSize(STYLE.font.lg);
    doc.setFont(STYLE.font.family, "bold");
    doc.text("FORMATO DE MANTENIMIENTO GAS EXPRESS NIETO", x + STYLE.header.logoW + centerW / 2, y + 14, { align: "center" });
    doc.setFontSize(STYLE.font.md);
    doc.text("REGISTRO DE BITACORA DE REEMPLAZO", x + STYLE.header.logoW + centerW / 2, y + 21, { align: "center" });

    doc.setFont(STYLE.font.family, "normal");
    doc.setFontSize(STYLE.font.sm);
    doc.line(metaX, y + 8, x + w, y + 8);
    doc.line(metaX, y + 16, x + w, y + 16);
    doc.line(metaX, y + 24, x + w, y + 24);
    doc.text("Formato: GEN-04-26", metaX + 2, y + 5.5);
    doc.text("Version: 1", metaX + 2, y + 13.5);
    doc.text(`F. reparacion: ${record.fecha || "-"}`, metaX + 2, y + 21.5);
    doc.text(`Folio: ${record.folio || "-"}`, metaX + 2, y + 29.5);
  }

  function drawInfo(doc, record) {
    let y = 47;
    doc.setFontSize(STYLE.font.md);

    drawField(doc, "Fecha fab.:", record.fecha_fabricacion || "-", 11, y, 96);
    drawField(doc, "Economico:", record.equipo || "-", 108, y, 200);

    y += 9;
    drawField(doc, "Marca:", record.marca || "-", 11, y, 72);
    drawField(doc, "Modelo:", record.modelo || "-", 74, y, 134);
    drawField(doc, "Serie:", record.serie || "-", 136, y, 200);

    y += 9;
    const mt = parseType(record.estado);
    doc.setFont(STYLE.font.family, "bold");
    doc.text("Tipo de mantenimiento:", 11, y);
    doc.setFont(STYLE.font.family, "normal");
    checkbox(doc, 58, y - 4.2, mt.preventivo);
    doc.text("Preventivo", 64, y);
    checkbox(doc, 89, y - 4.2, mt.predictivo);
    doc.text("Predictivo", 95, y);
    checkbox(doc, 120, y - 4.2, mt.correctivo);
    doc.text("Correctivo", 126, y);

    y += 7;
    checkbox(doc, 58, y - 4.2, mt.modificacion);
    doc.text("Modificacion / Mejora", 64, y);
    checkbox(doc, 123, y - 4.2, mt.alta);
    doc.text("Alta de Activo", 129, y);

    y += 9;
    drawField(doc, "Tecnico:", record.tecnico || "-", 11, y, 200);

    y += 9;
    drawField(doc, "OT no.:", record.ot_no || "-", 11, y, 96);
    drawField(doc, "Hora inicio:", record.hora_inicio || "--:--", 108, y, 152);
    drawField(doc, "Hora termino:", record.hora_termino || "--:--", 153, y, 200);

    return y + 6;
  }

  function drawTable(doc, y, record) {
    const x = 8;
    const w = 194;
    const headH = 8;
    const rowH = 8;
    const rows = splitPiecesV2(record);

    doc.rect(x, y, w, headH + rowH * 5);
    doc.line(x, y + headH, x + w, y + headH);
    for (let i = 1; i <= 5; i += 1) doc.line(x, y + headH + i * rowH, x + w, y + headH + i * rowH);

    doc.setFont(STYLE.font.family, "bold");
    doc.setFontSize(STYLE.font.md);
    doc.text("Revisiones efectuadas/Piezas cambiadas", x + 2, y + 5.5);
    doc.setFont(STYLE.font.family, "normal");
    rows.forEach((row, i) => doc.text(row, x + 2, y + headH + i * rowH + 5.5));

    return y + headH + rowH * 5 + 9;
  }

  function drawDescription(doc, y, record) {
    doc.setFont(STYLE.font.family, "bold");
    doc.setFontSize(STYLE.font.md);
    doc.text("DESCRIPCION DE TRABAJO REALIZADO:", 11, y);
    doc.setFont(STYLE.font.family, "normal");
    const text = doc.splitTextToSize(String(record.notas || "-"), 188);
    doc.text(text, 11, y + 6);

    let ly = y + 9;
    for (let i = 0; i < 4; i += 1) {
      doc.line(11, ly + i * 8, 199, ly + i * 8);
    }

    return y + 40;
  }

  function drawSignatures(doc) {
    const y = 242;
    doc.line(20, y, 86, y);
    doc.line(124, y, 190, y);
    doc.setFont(STYLE.font.family, "bold");
    doc.setFontSize(STYLE.font.sm);
    doc.text("Firma quien realizo el mantenimiento", 53, y + 5, { align: "center" });
    doc.text("Firma quien recibe", 157, y + 5, { align: "center" });
  }

  function drawFooter(doc) {
    doc.setFont(STYLE.font.family, "bold");
    doc.setFontSize(8);
    doc.text("Formato: GEN-04-26 Version: 1", 198, 292, { align: "right" });
  }

  function drawEvidencePage(doc, evidenceDataUrl, record) {
    doc.addPage();
    doc.setFont(STYLE.font.family, "bold");
    doc.setFontSize(12);
    doc.text("EVIDENCIA FOTOGRAFICA", 105, 18, { align: "center" });
    doc.setFont(STYLE.font.family, "normal");
    doc.setFontSize(STYLE.font.md);
    doc.text(`Folio: ${record.folio || "-"}`, 10, 28);
    doc.text(`OT no.: ${record.ot_no || "-"}`, 70, 28);
    doc.text(`Tecnico: ${record.tecnico || "-"}`, 125, 28);

    const slots = [
      { x: 10, y: 36, w: 90, h: 120 },
      { x: 110, y: 36, w: 90, h: 120 },
      { x: 10, y: 165, w: 90, h: 120 },
      { x: 110, y: 165, w: 90, h: 120 },
    ];

    const images = Array.isArray(evidenceDataUrl) ? evidenceDataUrl.filter(Boolean) : [evidenceDataUrl].filter(Boolean);
    if (!images.length) {
      slots.forEach((s, i) => {
        doc.rect(s.x, s.y, s.w, s.h);
        doc.text(`Evidencia ${i + 1}`, s.x + s.w / 2, s.y + 6, { align: "center" });
      });
      return;
    }

    images.slice(0, 4).forEach((img, i) => {
      const s = slots[i];
      const type = img.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.rect(s.x, s.y, s.w, s.h);
      try {
        doc.addImage(img, type, s.x + 2, s.y + 8, s.w - 4, s.h - 10);
      } catch (_) {
        doc.text("No se pudo cargar imagen", s.x + s.w / 2, s.y + s.h / 2, { align: "center" });
      }
      doc.text(`Evidencia ${i + 1}`, s.x + s.w / 2, s.y + 6, { align: "center" });
    });
  }

  async function buildPdf(record, evidenceDataUrl, options) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    setBase(doc);
    const logoDataUrl = await preloadLogo();

    drawHeader(doc, record, logoDataUrl);
    let y = drawInfo(doc, {
      ...record,
      hora_inicio: record.hora_inicio || options?.horaInicio || "--:--",
      hora_termino: record.hora_termino || options?.horaTermino || "--:--",
    });
    y = drawTable(doc, y, record);
    y = drawDescription(doc, y, record);
    drawSignatures(doc);
    drawFooter(doc);
    drawEvidencePage(doc, evidenceDataUrl, record);

    const dateRef = record.fecha || options?.defaultDate || new Date().toISOString().slice(0, 10);
    const fileName = `bitacora_${record.folio || safeName(record.equipo)}_${dateRef}.pdf`;
    const blobUrl = doc.output("bloburl");

    const previewTab = options?.previewTab && !options.previewTab.closed
      ? options.previewTab
      : window.open("", "_blank");
    if (!previewTab) {
      doc.save(fileName);
      return;
    }
    previewTab.location.href = blobUrl;

    // Fallback download trigger in case browser blocks blob preview.
    setTimeout(() => {
      if (previewTab.closed) return;
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 1500);
  }

  window.maintenancePdfTemplate = { buildPdf, STYLE };
})();

