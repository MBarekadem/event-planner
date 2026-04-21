// useToast.jsx — Hook toast réutilisable pour tous les dashboards
import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

// ── Styles par type ───────────────────────────────────────────────────────────
const STYLES = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", icon: "#16a34a", title: "#15803d", bar: "#22c55e" },
  error:   { bg: "#fef2f2", border: "#fecaca", icon: "#dc2626", title: "#b91c1c", bar: "#ef4444" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", icon: "#2563eb", title: "#1d4ed8", bar: "#3b82f6" },
  warning: { bg: "#fffbeb", border: "#fde68a", icon: "#d97706", title: "#b45309", bar: "#f59e0b" },
};

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
};

// ── Toast individuel ──────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);
  const [hovered, setHovered]   = useState(false);
  const intervalRef = useRef(null);
  const s        = STYLES[toast.type] || STYLES.info;
  const Icon     = ICONS[toast.type]  || Info;
  const duration = toast.duration || 4000;

  useEffect(() => {
    if (hovered) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(intervalRef.current); onRemove(toast.id); return 0; }
        return p - (100 / (duration / 50));
      });
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [hovered, toast.id, duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{    opacity: 0, x: 80, scale: 0.88, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        overflow: "hidden", minWidth: 300, maxWidth: 380,
        position: "relative", cursor: "default",
      }}
    >
      {/* Barre de progression */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, height: 3,
        width: `${progress}%`, background: s.bar, borderRadius: "0 0 0 14px",
        transition: hovered ? "none" : "width 50ms linear",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px 18px" }}>
        {/* Icône */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${s.icon}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={s.icon} strokeWidth={2.2} />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {toast.title && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: s.title, lineHeight: 1.3 }}>
              {toast.title}
            </p>
          )}
          <p style={{
            margin: toast.title ? "3px 0 0" : 0,
            fontSize: 13, color: "#374151", lineHeight: 1.5, wordBreak: "break-word",
          }}>
            {toast.message}
          </p>
        </div>

        {/* Fermer */}
        <button
          onClick={() => onRemove(toast.id)}
          style={{
            flexShrink: 0, background: "none", border: "none", cursor: "pointer",
            padding: 2, color: "#9ca3af", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "none"; }}
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 99999,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={t} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 99998,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 20,
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              padding: "28px 28px 24px", maxWidth: 400, width: "100%",
            }}
          >
            {/* Icône */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, marginBottom: 16,
              background: danger ? "#fef2f2" : "#eff6ff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {danger
                ? <AlertTriangle size={24} color="#dc2626" />
                : <Info size={24} color="#2563eb" />
              }
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#111827" }}>
              {title}
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
              {message}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #e5e7eb",
                  background: "white", color: "#374151", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                  background: danger ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color: "white", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", boxShadow: danger ? "0 4px 12px rgba(220,38,38,0.3)" : "0 4px 12px rgba(37,99,235,0.3)",
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Hook principal ────────────────────────────────────────────────────────────
let _id = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null); // { title, message, danger, resolve }

  const remove = useCallback((id) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const add = useCallback(({ type = "info", title, message, duration = 4000 }) => {
    const id = ++_id;
    setToasts(p => [...p.slice(-4), { id, type, title, message, duration }]);
    return id;
  }, []);

  // ── Méthodes toast ──────────────────────────────────────────────────────────
  const toast = {
    success: (message, title, duration) => add({ type: "success", title, message, duration }),
    error:   (message, title, duration) => add({ type: "error",   title, message, duration }),
    info:    (message, title, duration) => add({ type: "info",    title, message, duration }),
    warning: (message, title, duration) => add({ type: "warning", title, message, duration }),
  };

  // ── Remplacement de window.confirm() ───────────────────────────────────────
  // Usage : const ok = await showConfirm({ title: "...", message: "...", danger: true })
  const showConfirm = useCallback(({ title, message, danger = false, confirmLabel, cancelLabel }) => {
    return new Promise((resolve) => {
      setConfirm({ title, message, danger, confirmLabel, cancelLabel, resolve });
    });
  }, []);

  const handleConfirm = () => {
    confirm?.resolve(true);
    setConfirm(null);
  };

  const handleCancel = () => {
    confirm?.resolve(false);
    setConfirm(null);
  };

  // ── Composant à placer dans le JSX ─────────────────────────────────────────
  const ToastProvider = () => (
    <>
      <ToastContainer toasts={toasts} onRemove={remove} />
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        danger={confirm?.danger}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );

  return { toast, showConfirm, ToastProvider };
}