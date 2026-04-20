import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

export default function CreatePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/auth/set-password",
        { password: form.password, confirmPassword: form.confirmPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const user = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({ ...user, hasAppPassword: true }));

      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);

    } catch (err) {
      setError(err.response?.data?.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const getStrength = (pwd) => {
    if (!pwd) return { level: 0, label: "", color: "#e5e7eb" };
    if (pwd.length < 6) return { level: 1, label: "Trop court", color: "#ef4444" };
    if (pwd.length < 8) return { level: 2, label: "Faible", color: "#f97316" };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { level: 4, label: "Fort", color: "#22c55e" };
    return { level: 3, label: "Moyen", color: "#eab308" };
  };

  const strength = getStrength(form.password);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "relative", // ← important pour le bouton retour
          background: "white",
          borderRadius: 24,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)"
        }}
      >
        {/* Bouton retour */}
        <button
           onClick={() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");}}
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#64748b",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Retour
        </button>

        {/* Icône */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            boxShadow: "0 8px 24px rgba(99,102,241,0.3)"
          }}>
            🔐
          </div>
        </div>

        {/* Titre */}
        <h2 style={{ textAlign: "center", fontSize: 26, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
          Créez votre mot de passe
        </h2>
        <p style={{ textAlign: "center", color: "#64748b", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Puisque vous vous êtes connecté via Google, créez un mot de passe pour confirmer vos commandes sur l'application.
        </p>

        {/* Succès */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "#f0fdf4", border: "1px solid #86efac",
              borderRadius: 12, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 20
            }}
          >
            <CheckCircle size={20} color="#16a34a" />
            <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 14 }}>
              Mot de passe créé ! Redirection...
            </span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Nouveau mot de passe
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 caractères"
                required
                style={{
                  width: "100%", padding: "12px 44px 12px 16px",
                  border: "2px solid #e5e7eb", borderRadius: 12,
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Barre de force */}
            {form.password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 4,
                      background: i <= strength.level ? strength.color : "#e5e7eb",
                      transition: "background 0.3s"
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: strength.color, fontWeight: 500 }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirmer mot de passe */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Confirmer le mot de passe
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Répétez votre mot de passe"
                required
                style={{
                  width: "100%", padding: "12px 44px 12px 16px",
                  border: `2px solid ${form.confirmPassword && form.confirmPassword !== form.password ? "#fca5a5" : "#e5e7eb"}`,
                  borderRadius: 12, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = form.confirmPassword !== form.password ? "#fca5a5" : "#e5e7eb"}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: 10, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 16
              }}
            >
              <XCircle size={16} color="#dc2626" />
              <span style={{ color: "#dc2626", fontSize: 13 }}>{error}</span>
            </motion.div>
          )}

          {/* Bouton soumettre */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: "100%", padding: "14px",
              background: loading ? "#a5b4fc" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "white", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              transition: "all 0.2s"
            }}
          >
            {loading ? "Enregistrement..." : "Créer mon mot de passe"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 20 }}>
          Ce mot de passe sera utilisé pour confirmer vos commandes sur l'application.
        </p>
      </motion.div>
    </div>
  );
}