const SUPABASE_URL = "https://iukhcmwqsxjybovkpxhm.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_Doj-L2g49RDaf1QFyE1Y9w_cqAs8Rbk";
    const TABLE_NAME = "registros_mantenimiento";
    const EVIDENCE_BUCKET = "evidencias_mantenimiento";
    const DELETE_RECORDS_PASSWORD = "Gen2026!";

    const configNotice = document.getElementById("configNotice");
    const appSection = document.getElementById("appSection");
    const statusMsg = document.getElementById("statusMsg");
    const maintenanceForm = document.getElementById("maintenanceForm");
    const recordsBody = document.getElementById("recordsBody");
    const filterTecnico = document.getElementById("filterTecnico");
    const filterFrom = document.getElementById("filterFrom");
    const filterTo = document.getElementById("filterTo");
    const refreshBtn = document.getElementById("refreshBtn");
    const exportBtn = document.getElementById("exportBtn");
    const clearBtn = document.getElementById("clearBtn");
    const equipoSelect = document.getElementById("equipo");
    const autotanqueField = document.getElementById("autotanqueField");
    const estacionField = document.getElementById("estacionField");
    const estacionSelect = document.getElementById("estacion_select");
    const plantaField = document.getElementById("plantaField");
    const plantaSelect = document.getElementById("planta_select");
    const locationTypeButtons = Array.from(document.querySelectorAll(".location-type-btn"));
    const columnTabs = Array.from(document.querySelectorAll(".tab-btn"));
    const piezaSelect = document.getElementById("pieza");
    const customPieceInput = document.getElementById("pieza_personalizada");
    const piezaCantidadInput = document.getElementById("pieza_cantidad");
    const addPieceBtn = document.getElementById("addPieceBtn");
    const addCustomPieceBtn = document.getElementById("addCustomPieceBtn");
    const selectedPiecesEl = document.getElementById("selectedPieces");
    const cantidadInput = document.getElementById("cantidad");
    const evidenceInput = document.getElementById("evidencia");
    const previewGallery = document.getElementById("previewGallery");
    const fechaInput = document.getElementById("fecha");
    const fechaFabricacionInput = document.getElementById("fecha_fabricacion");
    const folioPreview = document.getElementById("folio_preview");
    const horaInicioPreview = document.getElementById("hora_inicio_preview");
    const horaTerminoInput = document.getElementById("hora_termino");

    const today = new Date().toISOString().slice(0, 10);
    fechaInput.value = today;
    folioPreview.value = "";
    horaInicioPreview.value = "";
    let currentRecords = [];
    let selectedPieces = [];
    let currentLocationType = "";

    function isConfigured() {
      return !SUPABASE_URL.includes("PEGA_AQUI") && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");
    }

    function setStatus(message, isError = false) {
      statusMsg.textContent = message || "";
      statusMsg.classList.toggle("error", isError);
    }

    const client = isConfigured() ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.readAsDataURL(file);
      });
    }

    function safeName(text) {
      return String(text || "registro").replace(/[^\w\-]+/g, "_").slice(0, 40);
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo convertir la imagen."));
        reader.readAsDataURL(blob);
      });
    }

    async function urlToDataUrl(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error("No se pudo descargar evidencia.");
      const blob = await response.blob();
      return blobToDataUrl(blob);
    }

    async function getEvidenceDataUrlsFromRecord(record) {
      const list = Array.isArray(record.evidencia_urls) ? [...record.evidencia_urls] : [];
      if (record.evidencia_url && !list.includes(record.evidencia_url)) {
        list.unshift(record.evidencia_url);
      }
      const unique = [...new Set(list.filter(Boolean))].slice(0, 4);
      const converted = await Promise.all(
        unique.map(async (src) => {
          if (/^data:image\//i.test(src)) return src;
          try {
            return await urlToDataUrl(src);
          } catch (_) {
            return null;
          }
        })
      );
      return converted.filter(Boolean);
    }

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function getTimeHHMM(baseDate = new Date()) {
      return `${pad(baseDate.getHours())}:${pad(baseDate.getMinutes())}`;
    }

    function buildAutoIds(baseDate = new Date()) {
      const y = baseDate.getFullYear();
      const m = pad(baseDate.getMonth() + 1);
      const d = pad(baseDate.getDate());
      const hh = pad(baseDate.getHours());
      const mm = pad(baseDate.getMinutes());
      const ss = pad(baseDate.getSeconds());
      const stamp = `${y}${m}${d}${hh}${mm}${ss}`;
      const folio6 = String(baseDate.getTime() % 1000000).padStart(6, "0");
      return {
        ot_no: `OT-${stamp}`,
        folio: folio6
      };
    }

    function refreshAutoPreview() {
      const now = new Date();
      const ids = buildAutoIds(now);
      folioPreview.value = ids.folio;
      horaInicioPreview.value = getTimeHHMM(now);
    }

    function setLocationType(type) {
      currentLocationType = type || "";
      locationTypeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.locationType === currentLocationType);
      });

      autotanqueField.classList.add("hidden");
      estacionField.classList.add("hidden");
      plantaField.classList.add("hidden");
      equipoSelect.disabled = true;
      estacionSelect.disabled = true;
      plantaSelect.disabled = true;
      equipoSelect.required = false;
      estacionSelect.required = false;
      plantaSelect.required = false;

      if (currentLocationType === "autotanque") {
        autotanqueField.classList.remove("hidden");
        equipoSelect.disabled = false;
        equipoSelect.required = true;
        return;
      }

      if (currentLocationType === "planta") {
        plantaField.classList.remove("hidden");
        plantaSelect.disabled = false;
        plantaSelect.required = true;
        return;
      }

      if (currentLocationType === "estacion") {
        estacionField.classList.remove("hidden");
        estacionSelect.disabled = false;
        estacionSelect.required = true;
      }
    }

    function resolveEquipoValue() {
      if (currentLocationType === "estacion") {
        return (estacionSelect.value || "").trim();
      }
      if (currentLocationType === "planta") {
        return (plantaSelect.value || "").trim();
      }
      return (equipoSelect.value || "").trim();
    }

    function buildPiecesCatalog() {
      return [
        "Medidor magnetel ROCHESTER",
        "Válvula máximo llenado de 1/4\" REGO",
        "Manómetro de 0-21 kg/cm^2 METRON",
        "Termómetro de 1/4\" de -50 a 50 °C METRON",
        "Válvula de seguridad 3\" 250 PSIG",
        "Válvula de seguridad 2\" 250 PSIG",
        "Válvula interna de 2\"",
        "Actuador neumático REGO",
        "No retroceso de 3/4\" REGO",
        "No retroceso de 1 1/4\" REGO",
        "Válvula By-Pass de 1 1/4\" BLACKMER / CORKEN",
        "Válvula de aguja de 1/4\" ACERO",
        "Válvula de globo de 3/4\" REGO",
        "Carrete para manguera PYPESA",
        "Válvula tipo bola roscada de 2\" WORCESTER",
        "Válvula tipo bola roscada de 1 1/4\" WORCESTER",
        "Válvula tipo bola roscada de 1\" WORCESTER",
        "Manguera para carrete 3/4\" x61 GATES",
        "Manguera para carrete 1\" x61 GATES",
        "Medidor 1 1/2\" RED SEAL (sin registro)",
        "Registro electrónico RI 505 PEGASUS",
        "Bomba 2\" BLACKMER / Bomba 2\" CORKEN",
        "Filtro tipo sarco roscado 2\"",
        "Manguera 2\" GATES 2 m",
        "Manguera 1 1/4\" GATES (2 m)",
        "Manguera 1\" GATES 2 m",
        "Válvula para retorno de vapores 1 1/4\" REGO",
        "Válvula de cierre rápido 1\" pérdida mínima REGO",
        "Válvula doble check 3\" REGO (76x84 acmé)",
        "Unión giratoria 1\" x 90° PYPESA",
        "Válvula solenoide 1\" 12V APE SKINNER",
        "Cilindro de aire para sistema neumático y embrague"
      ];
    }

    function populatePiecesSelect() {
      const pieces = buildPiecesCatalog();
      piezaSelect.innerHTML = `<option value="">Selecciona...</option>${pieces
        .map((piece) => `<option value="${piece.replace(/"/g, "&quot;")}">${piece}</option>`)
        .join("")}`;
    }

    function getSelectedPieces() {
      return selectedPieces.slice();
    }

    function updateTotalQuantity() {
      const total = selectedPieces.reduce((acc, item) => acc + Number(item.qty || 0), 0);
      cantidadInput.value = total > 0 ? String(total) : "1";
    }

    function renderSelectedPieces() {
      if (!selectedPieces.length) {
        selectedPiecesEl.innerHTML = `<span class="selected-empty">Sin piezas agregadas</span>`;
        updateTotalQuantity();
        return;
      }
      selectedPiecesEl.innerHTML = selectedPieces
        .map(
          (piece, idx) =>
            `<button type="button" class="piece-chip" data-piece-index="${idx}" title="Quitar pieza">${piece.name} (x${piece.qty}) <span aria-hidden="true">×</span></button>`
        )
        .join("");
      updateTotalQuantity();
    }

    function addPieceByName(pieceName) {
      const piece = (pieceName || "").trim();
      if (!piece) {
        setStatus("Selecciona o escribe una pieza para agregar.", true);
        return false;
      }
      const qty = Math.max(1, Number(piezaCantidadInput.value) || 1);
      const existingIndex = selectedPieces.findIndex((item) => item.name.toLowerCase() === piece.toLowerCase());
      if (existingIndex >= 0) {
        selectedPieces[existingIndex].qty += qty;
      } else {
        if (selectedPieces.length >= 5) {
          setStatus("Máximo 5 piezas por formato.", true);
          return false;
        }
        selectedPieces.push({ name: piece, qty });
      }
      piezaCantidadInput.value = "1";
      renderSelectedPieces();
      setStatus("");
      return true;
    }

    function addPieceFromDropdown() {
      const added = addPieceByName(piezaSelect.value);
      if (added) piezaSelect.value = "";
    }

    function addCustomPiece() {
      const added = addPieceByName(customPieceInput.value);
      if (added) customPieceInput.value = "";
    }

    function resetCaptureForm() {
      maintenanceForm.reset();
      selectedPieces = [];
      piezaCantidadInput.value = "1";
      piezaSelect.value = "";
      customPieceInput.value = "";
      fechaInput.value = today;
      fechaFabricacionInput.value = "";
      setLocationType("");
      refreshAutoPreview();
      renderSelectedPieces();
      previewGallery.innerHTML = "";
      previewGallery.classList.add("hidden");
    }


    async function uploadEvidence(file, idx = 0) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `registros/${Date.now()}_${idx}_${safeName(file.name)}.${ext}`;
      const { error } = await client.storage.from(EVIDENCE_BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = client.storage.from(EVIDENCE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }

    async function loadRecords() {
      let query = client
        .from(TABLE_NAME)
        .select("id, fecha, fecha_fabricacion, folio, ot_no, hora_inicio, hora_termino, tecnico, equipo, marca, modelo, serie, pieza, cantidad, estado, notas, evidencia_url, evidencia_urls")
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      const tecnico = filterTecnico.value.trim();
      if (tecnico) query = query.ilike("tecnico", `%${tecnico}%`);
      if (filterFrom.value) query = query.gte("fecha", filterFrom.value);
      if (filterTo.value) query = query.lte("fecha", filterTo.value);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    function renderRecords(records) {
      recordsBody.innerHTML = "";
      if (!records.length) {
        recordsBody.innerHTML = '<tr><td colspan="17">No hay registros para los filtros seleccionados.</td></tr>';
        return;
      }

      records.forEach((r, index) => {
        const tr = document.createElement("tr");
        const evidenceList = Array.isArray(r.evidencia_urls) ? r.evidencia_urls : [];
        const firstEvidence = evidenceList[0] || r.evidencia_url || "";
        const evidencia = firstEvidence
          ? `<a href="${firstEvidence}" target="_blank" rel="noopener"><img class="thumb" src="${firstEvidence}" alt="Evidencia" /></a>${evidenceList.length > 1 ? `<div>${evidenceList.length} imagenes</div>` : ""}`
          : "-";

        tr.innerHTML = `
          <td class="col-general">${r.fecha || "-"}</td>
          <td class="col-general">${r.fecha_fabricacion || "-"}</td>
          <td class="col-general">${r.folio || "-"}</td>
          <td class="col-general">${r.ot_no || "-"}</td>
          <td class="col-general">${r.hora_inicio || "-"}</td>
          <td class="col-general">${r.hora_termino || "-"}</td>
          <td class="col-general">${r.tecnico || "-"}</td>
          <td class="col-equipo">${r.equipo || "-"}</td>
          <td class="col-equipo">${r.marca || "-"}</td>
          <td class="col-equipo">${r.modelo || "-"}</td>
          <td class="col-equipo">${r.serie || "-"}</td>
          <td class="col-mantenimiento">${r.pieza || "-"}</td>
          <td class="col-mantenimiento">${r.cantidad ?? "-"}</td>
            <td class="col-mantenimiento">${r.estado || "-"}</td>
            <td class="col-evidencia">${evidencia}</td>
            <td class="notes col-evidencia">${r.notas || "-"}</td>
            <td class="col-evidencia"><button type="button" class="btn-secondary btn-compact print-row-btn" data-row-index="${index}">Imprimir PDF</button></td>
          `;
        recordsBody.appendChild(tr);
      });
    }

    function applyColumnTab(tab) {
      const allowed = tab === "all" ? [] : [`col-${tab}`];
      document.querySelectorAll("table th, table td").forEach((cell) => {
        const isDataCol = /col-(general|equipo|mantenimiento|evidencia)/.test(cell.className);
        if (!isDataCol) return;
        const visible = tab === "all" || allowed.some((name) => cell.classList.contains(name));
        cell.classList.toggle("is-hidden-col", !visible);
      });
    }

    columnTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        columnTabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applyColumnTab(btn.dataset.tab || "all");
      });
    });

    async function refreshData() {
      try {
        currentRecords = await loadRecords();
        renderRecords(currentRecords);
      } catch (error) {
        setStatus(`Error al cargar registros: ${error.message}`, true);
      }
    }

    evidenceInput.addEventListener("change", async () => {
      previewGallery.innerHTML = "";
      const files = Array.from(evidenceInput.files || []);
      if (!files.length) {
        previewGallery.classList.add("hidden");
        return;
      }
      try {
        const previews = await Promise.all(files.slice(0, 4).map((file) => fileToDataUrl(file)));
        previews.forEach((src, i) => {
          const img = document.createElement("img");
          img.src = src;
          img.alt = `Vista previa ${i + 1}`;
          img.className = "preview";
          previewGallery.appendChild(img);
        });
        previewGallery.classList.remove("hidden");
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    addPieceBtn.addEventListener("click", () => {
      addPieceFromDropdown();
    });

    addCustomPieceBtn.addEventListener("click", () => {
      addCustomPiece();
    });

    customPieceInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      addCustomPiece();
    });

    locationTypeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        setStatus("");
        setLocationType(btn.dataset.locationType || "");
      });
    });

    selectedPiecesEl.addEventListener("click", (event) => {
      const chip = event.target.closest(".piece-chip");
      if (!chip) return;
      const idx = Number(chip.dataset.pieceIndex);
      if (Number.isNaN(idx) || idx < 0 || idx >= selectedPieces.length) return;
      selectedPieces.splice(idx, 1);
      renderSelectedPieces();
    });

    recordsBody.addEventListener("click", async (event) => {
      const btn = event.target.closest(".print-row-btn");
      if (!btn) return;
      const idx = Number(btn.dataset.rowIndex);
      if (Number.isNaN(idx) || idx < 0 || idx >= currentRecords.length) return;

      const previewTab = window.open("", "_blank");
      if (!previewTab) {
        setStatus("Activa pop-ups para abrir el formato de impresión.", true);
        return;
      }

      btn.disabled = true;
      try {
        const record = currentRecords[idx];
        const evidenceDataUrls = await getEvidenceDataUrlsFromRecord(record);
        await window.maintenancePdfTemplate.buildPdf(record, evidenceDataUrls, {
          defaultDate: today,
          previewTab
        });
        setStatus("Formato abierto para impresión.");
      } catch (error) {
        if (previewTab && !previewTab.closed) previewTab.close();
        setStatus(`No se pudo generar el PDF: ${error.message}`, true);
      } finally {
        btn.disabled = false;
      }
    });

    maintenanceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("");
      const previewTab = window.open("", "_blank");

      const formData = new FormData(maintenanceForm);
      const record = Object.fromEntries(formData.entries());
      delete record.evidencia;
      const resolvedEquipo = resolveEquipoValue();
      if (!resolvedEquipo) {
        if (previewTab && !previewTab.closed) previewTab.close();
        setStatus("Selecciona la ubicacion de reparacion.", true);
        return;
      }
      record.equipo = resolvedEquipo;
      const selectedPiecesList = getSelectedPieces();
      if (!selectedPiecesList.length) {
        if (previewTab && !previewTab.closed) previewTab.close();
        setStatus("Selecciona al menos una pieza cambiada.", true);
        return;
      }
      record.pieza = selectedPiecesList.map((item) => `${item.name} (x${item.qty})`).join(", ");
      const ids = buildAutoIds();
      record.ot_no = ids.ot_no;
      record.folio = ids.folio;
      record.hora_inicio = getTimeHHMM();
      record.hora_termino = record.hora_termino || horaTerminoInput.value;
      record.cantidad = selectedPiecesList.reduce((acc, item) => acc + Number(item.qty || 0), 0);
      record.notas = record.notas || null;
      record.fecha_fabricacion = record.fecha_fabricacion || null;

      const files = Array.from(evidenceInput.files || []);
      let evidenceDataUrls = [];
      let evidencePublicUrls = [];
      if (files.length) {
        try {
          evidenceDataUrls = await Promise.all(files.slice(0, 4).map((file) => fileToDataUrl(file)));
          evidencePublicUrls = await Promise.all(files.slice(0, 4).map((file, idx) => uploadEvidence(file, idx)));
        } catch (error) {
          if (evidenceDataUrls.length) {
            evidencePublicUrls = [...evidenceDataUrls];
            setStatus("Storage no disponible. Evidencia guardada en base64.", true);
          } else {
            setStatus(`No se pudo procesar la evidencia: ${error.message}`, true);
            return;
          }
        }
      }
      record.evidencia_urls = evidencePublicUrls;
      record.evidencia_url = evidencePublicUrls[0] || null;

      const { error } = await client.from(TABLE_NAME).insert(record);
      if (error) {
        setStatus(`Error al guardar: ${error.message}`, true);
        return;
      }

      resetCaptureForm();
      await window.maintenancePdfTemplate.buildPdf(record, evidenceDataUrls, {
        defaultDate: today,
        previewTab
      });
      setStatus("Registro guardado. Formato listo para imprimir.");
      await refreshData();
    });

    refreshBtn.addEventListener("click", async () => {
      await refreshData();
      setStatus("Datos actualizados.");
    });

    exportBtn.addEventListener("click", () => {
      if (!currentRecords.length) {
        setStatus("No hay registros para exportar.", true);
        return;
      }

      const rows = currentRecords.map((r) => ({
        Fecha_Reparacion: r.fecha,
        Fecha_Fabricacion: r.fecha_fabricacion || "",
        Folio: r.folio || "",
        Orden_Trabajo: r.ot_no || "",
        Hora_Inicio: r.hora_inicio || "",
        Hora_Termino: r.hora_termino || "",
        Tecnico: r.tecnico,
        Unidad: r.equipo,
        Marca: r.marca || "",
        Modelo: r.modelo || "",
        Serie: r.serie || "",
        Pieza: r.pieza,
        Cantidad: r.cantidad,
        Tipo_Mantenimiento: r.estado,
        Evidencia_URL: r.evidencia_url || "",
        Evidencias: Array.isArray(r.evidencia_urls) ? r.evidencia_urls.join(" | ") : "",
        Notas: r.notas || ""
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Cambios");
      XLSX.writeFile(workbook, `cambios_mantenimiento_${today}.xlsx`);
      setStatus("Archivo Excel descargado.");
    });

    clearBtn.addEventListener("click", async () => {
      if (!confirm("Seguro que deseas borrar todos los registros?")) return;

      const typedPassword = prompt("Ingresa la contraseña para borrar todos los registros:");
      if (typedPassword === null) {
        setStatus("Borrado cancelado.");
        return;
      }
      if (typedPassword.trim() !== DELETE_RECORDS_PASSWORD) {
        setStatus("Contraseña incorrecta. No se borraron registros.", true);
        return;
      }

      const { error } = await client.from(TABLE_NAME).delete().not("id", "is", null);
      if (error) {
        setStatus(`Error al borrar: ${error.message}`, true);
        return;
      }
      setStatus("Registros eliminados.");
      await refreshData();
    });

    if (!isConfigured()) {
      configNotice.classList.remove("hidden");
      appSection.classList.add("hidden");
    } else {
      appSection.classList.remove("hidden");
      populatePiecesSelect();
      setLocationType("");
      renderSelectedPieces();
      refreshAutoPreview();
      setInterval(refreshAutoPreview, 30000);
      applyColumnTab("all");
      refreshData();
    }

