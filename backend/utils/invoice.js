import fs from "fs";
import PDFDocument from "pdfkit";

export const generateInvoice = (location, amount) => {

    if (!fs.existsSync("./invoices")) fs.mkdirSync("./invoices");

    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const filePath = `./invoices/facture_${location._id}.pdf`;
    doc.pipe(fs.createWriteStream(filePath));

    const W = 595.28;
    const H = 841.89;
    const MARGIN = 45;

    // ── Couleurs ─────────────────────────────────────────────
    const NAVY      = "#1e3a8a";
    const NAVY_MID  = "#2563eb";
    const INDIGO    = "#4338CA";
    const INDIGO_L  = "#EEF2FF";
    const GREEN     = "#059669";
    const GREEN_L   = "#D1FAE5";
    const GRAY_900  = "#111827";
    const GRAY_700  = "#374151";
    const GRAY_500  = "#6B7280";
    const GRAY_300  = "#D1D5DB";
    const GRAY_100  = "#F3F4F6";
    const YELLOW_L  = "#FEF9C3";
    const YELLOW_D  = "#78350F";
    const WHITE     = "#FFFFFF";

    // ── Helpers ───────────────────────────────────────────────
    const rect = (x, y, w, h, color, radius = 0) =>
        doc.save().roundedRect(x, y, w, h, radius).fill(color).restore();

    const hline = (y, color = GRAY_300, lw = 0.8) =>
        doc.save().moveTo(MARGIN, y).lineTo(W - MARGIN, y).strokeColor(color).lineWidth(lw).stroke().restore();

    const vline = (x, y1, y2, color = GRAY_300, lw = 0.8) =>
        doc.save().moveTo(x, y1).lineTo(x, y2).strokeColor(color).lineWidth(lw).stroke().restore();

    const txt = (text, x, y, opts = {}) => {
        const { size = 10, color = GRAY_900, bold = false, align = "left", width: w, opacity = 1 } = opts;
        doc.save()
            .font(bold ? "Helvetica-Bold" : "Helvetica")
            .fontSize(size)
            .fillColor(color, opacity)
            .text(String(text ?? "—"), x, y, { width: w ?? 200, align, lineBreak: false })
            .restore();
    };

    // ── Données ───────────────────────────────────────────────
    const org   = location.organisateur || {};
    const prest = location.resource?.prestataire || {};
    const res   = location.resource || {};
    const invoiceRef = `FAC-${String(location._id).slice(-6).toUpperCase()}`;
    const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

    const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    const fmtShort = (d) => new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric"
    });

    // Calcul TVA (19%)
    const amountNum = parseFloat(amount) || 0;
    const tva       = +(amountNum * 0.19).toFixed(2);
    const ht        = +(amountNum - tva).toFixed(2);

    // ════════════════════════════════════════════════════════
    // 1. HEADER — bande marine avec déco
    // ════════════════════════════════════════════════════════
    rect(0, 0, W, 145, NAVY);

    // Cercles décoratifs
    doc.save().circle(W - 50, -10, 130).fillOpacity(0.07).fill(WHITE).restore();
    doc.save().circle(W - 100, 90, 70).fillOpacity(0.05).fill(WHITE).restore();
    doc.save().circle(60, 145, 60).fillOpacity(0.05).fill(WHITE).restore();

    // Titre
    doc.save().font("Helvetica-Bold").fontSize(38).fillColor(WHITE).text("FACTURE", MARGIN, 40).restore();

    // Référence + date
    txt(invoiceRef,    MARGIN, 88,  { size: 11, color: "#93C5FD", bold: true });
    txt(`Émise le ${today}`, MARGIN, 108, { size: 9,  color: "#BFDBFE" });

    // Badge PAYÉ (haut droite)
    rect(W - 145, 48, 96, 30, GREEN_L, 15);
    txt("✓  PAYÉ", W - 130, 57, { size: 10, color: GREEN, bold: true });

    // ════════════════════════════════════════════════════════
    // 2. BLOC ORGANISATEUR + PRESTATAIRE
    // ════════════════════════════════════════════════════════
    const byY = 155;
    rect(0, byY, W, 120, GRAY_100);
    hline(byY + 120, GRAY_300);

    const midX = W / 2;

    // — Organisateur (gauche) —
    txt("FACTURÉ À", MARGIN, byY + 14, { size: 8, color: GRAY_500, bold: true });
    const orgName = `${org.firstname || ""} ${org.lastname || ""}`.trim() || "—";
    txt(orgName, MARGIN, byY + 30, { size: 13, color: GRAY_900, bold: true, width: midX - MARGIN - 20 });
    txt(org.email || "—",                   MARGIN, byY + 52, { size: 10, color: GRAY_700, width: midX - MARGIN - 20 });
    txt(org.numTel || org.phone || "—",     MARGIN, byY + 68, { size: 10, color: GRAY_700 });

    // Séparateur vertical
    vline(midX, byY + 14, byY + 105, GRAY_300);

    // — Prestataire (droite) —
    txt("PRESTATAIRE", midX + 20, byY + 14, { size: 8, color: GRAY_500, bold: true });
    const prestName = `${prest.firstname || ""} ${prest.lastname || ""}`.trim() || "EventPro";
    txt(prestName, midX + 20, byY + 30, { size: 13, color: GRAY_900, bold: true, width: midX - MARGIN - 20 });
    txt(prest.email || "—",                 midX + 20, byY + 52, { size: 10, color: GRAY_700, width: midX - MARGIN - 20 });
    txt(prest.numTel || prest.phone || "—", midX + 20, byY + 68, { size: 10, color: GRAY_700 });

    // ════════════════════════════════════════════════════════
    // 3. TABLEAU RESSOURCES
    // ════════════════════════════════════════════════════════
    let y = byY + 140;

    txt("DÉTAILS DE LA RÉSERVATION", MARGIN, y, { size: 8, color: INDIGO, bold: true });
    y += 16;

    // En-tête tableau
    const colW = [175, 90, 90, 80, 15]; // Ressource, Type, Catégorie, Prix, (pad)
    const cols = [MARGIN, MARGIN + 175, MARGIN + 265, MARGIN + 355, MARGIN + 435];

    rect(MARGIN, y, W - MARGIN * 2, 28, NAVY, 6);
    const headers = ["Ressource", "Type", "Catégorie", "Prix unitaire", "Montant HT"];
    headers.forEach((h, i) => {
        txt(h, cols[i] + 8, y + 8, { size: 9, color: WHITE, bold: true, width: colW[i] ?? 90 });
    });
    y += 28;

    // Ligne de données (fond blanc)
    rect(MARGIN, y, W - MARGIN * 2, 36, WHITE);
    hline(y + 36, "#E5E7EB");

    // Bordures colonnes internes
    [1, 2, 3, 4].forEach(i => vline(cols[i], y, y + 36, "#F3F4F6"));

    txt(res.name || "—",      cols[0] + 8, y + 12, { size: 10, color: GRAY_900, bold: true, width: 160 });
    txt(res.type || "—",      cols[1] + 8, y + 12, { size: 10, color: GRAY_700, width: 80 });
    txt(res.category || "—",  cols[2] + 8, y + 12, { size: 10, color: GRAY_700, width: 80 });
    txt(`${res.price ?? amountNum} €`, cols[3] + 8, y + 12, { size: 10, color: INDIGO, bold: true, width: 75 });
    txt(`${ht} €`,            cols[4] + 8, y + 12, { size: 10, color: GRAY_900, bold: true, width: 75 });

    y += 50;

    // ════════════════════════════════════════════════════════
    // 4. PÉRIODE DE LOCATION (bloc lavande)
    // ════════════════════════════════════════════════════════
    txt("PÉRIODE DE LOCATION", MARGIN, y, { size: 8, color: INDIGO, bold: true });
    y += 14;

    rect(MARGIN, y, W - MARGIN * 2, 60, INDIGO_L, 8);

    // Colonne gauche : Date début
    txt("▶  Date de début",  MARGIN + 16, y + 10, { size: 8,  color: GRAY_500 });
    txt(fmtDate(location.dateDebut), MARGIN + 16, y + 24, { size: 10, color: GRAY_900, bold: true, width: 220 });

    // Séparateur vertical dans bloc
    vline(MARGIN + (W - MARGIN * 2) / 2, y + 10, y + 50, "#C7D2FE");

    // Colonne droite : Date fin
    const halfBloc = MARGIN + (W - MARGIN * 2) / 2 + 16;
    txt("■  Date de fin",  halfBloc, y + 10, { size: 8,  color: GRAY_500 });
    txt(fmtDate(location.dateFin), halfBloc, y + 24, { size: 10, color: GRAY_900, bold: true, width: 220 });

    y += 78;

    // ════════════════════════════════════════════════════════
    // 5. ÉVÉNEMENT ASSOCIÉ (si présent)
    // ════════════════════════════════════════════════════════
    if (location.event?.title) {
        rect(MARGIN, y, W - MARGIN * 2, 30, YELLOW_L, 8);
        txt("Événement :", MARGIN + 16, y + 9, { size: 9, color: "#92400E" });
        txt(location.event.title, MARGIN + 90, y + 9, { size: 10, color: YELLOW_D, bold: true, width: 350 });
        y += 46;
    }

    // ════════════════════════════════════════════════════════
    // 6. SECTION TOTAUX (style devis HTML)
    // ════════════════════════════════════════════════════════
    hline(y, GRAY_300);
    y += 20;

    // Bloc totaux aligné à droite
    const totX = W - MARGIN - 200;
    const totW = 200;

    const totRow = (label, value, isLast = false) => {
        if (isLast) {
            rect(totX - 8, y - 4, totW + 8, 30, NAVY, 6);
            txt(label, totX,         y + 5, { size: 11, color: WHITE, bold: true, width: 120 });
            txt(value, totX + 120,   y + 5, { size: 11, color: WHITE, bold: true, width: 72, align: "right" });
        } else {
            txt(label, totX,         y, { size: 10, color: GRAY_700, width: 120 });
            txt(value, totX + 120,   y, { size: 10, color: GRAY_900, bold: true, width: 72, align: "right" });
            hline(y + 16, "#F3F4F6", 0.5);
        }
        y += isLast ? 40 : 24;
    };

    totRow("Sous-total HT",   `${ht} €`);
    totRow("TVA (19%)",       `${tva} €`);
    totRow("TOTAL TTC",       `${amountNum} €`, true);

    // Badge payé + date paiement (gauche)
    const badgeY = y - 34;
    rect(MARGIN, badgeY, 120, 28, GREEN_L, 14);
    txt("✓  PAYÉ", MARGIN + 16, badgeY + 8, { size: 10, color: GREEN, bold: true });

    if (location.paymentDate) {
        txt(`Réglé le ${fmtShort(location.paymentDate)}`, MARGIN, badgeY + 36, { size: 9, color: GRAY_500 });
    }

    y += 16;

    // ════════════════════════════════════════════════════════
    // 7. NOTE / CONDITIONS
    // ════════════════════════════════════════════════════════
    hline(y, GRAY_300);
    y += 16;

    txt("CONDITIONS", MARGIN, y, { size: 8, color: GRAY_500, bold: true });
    y += 14;
    txt("Ce document constitue une facture officielle de réservation de ressource.", MARGIN, y, { size: 9, color: GRAY_500, width: W - MARGIN * 2 });
    y += 14;
    txt("Paiement effectué via plateforme sécurisée Stripe. Conservez ce document comme preuve de paiement.", MARGIN, y, { size: 9, color: GRAY_500, width: W - MARGIN * 2 });

    // ════════════════════════════════════════════════════════
    // 8. FOOTER
    // ════════════════════════════════════════════════════════
    rect(0, H - 56, W, 56, NAVY);
    doc.save().circle(MARGIN / 2, H - 28, 20).fillOpacity(0.08).fill(WHITE).restore();
    doc.save().circle(W - MARGIN / 2, H - 28, 20).fillOpacity(0.08).fill(WHITE).restore();

    txt("Merci pour votre confiance ✦ EventPro Platform",
        0, H - 38, { size: 10, color: WHITE, bold: true, align: "center", width: W });
    txt("Document généré automatiquement — support@eventpro.tn",
        0, H - 20, { size: 8, color: "#93C5FD", align: "center", width: W });

    doc.end();
    return filePath;
};