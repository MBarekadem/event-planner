import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

/* ═══════════════════════════════════════════
   SVG ICONS (subset needed for AuthModal)
═══════════════════════════════════════════ */
const Ic = {
  close:  (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:  (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  xmark:  (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  info:   (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  lock:   (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  send:   (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  eye:    (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  box:    (p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
  service:(p) => <svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
};

const cx = (...a) => a.filter(Boolean).join(" ");

/* ── Field helpers ── */
const fieldCls = (err) => cx(
  "w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition",
  err
    ? "border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-100"
    : "border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
);

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-rose-500 text-[10px] mt-1">{error}</p>}
    </div>
  );
}

function TypeBadge({ type }) {
  return type === "product" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: "#DCFCE7", color: "#166534" }}>
      <Ic.box width={11} height={11} /> Produit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: "#EDE9FE", color: "#5B21B6" }}>
      <Ic.service width={11} height={11} /> Service
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AUTH MODAL
   - Connexion / Inscription inline (pas de navigation)
   - Après succès → appelle onAuthSuccess(token, user)
   - Le parent (MesReservations) ouvre ensuite l'InfoModal
═══════════════════════════════════════════════════════════════ */
export default function AuthModal({ isOpen, onClose, pendingItem, onAuthSuccess }) {
  const [tab, setTab]         = useState("login");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [loginForm, setLoginForm]   = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    firstname: "", lastname: "", email: "", password: "",
  });

  /* Reset à chaque ouverture */
  useEffect(() => {
    if (isOpen) {
      setError("");
      setTab("login");
      setShowPwd(false);
      setLoginForm({ email: "", password: "" });
      setSignupForm({ firstname: "", lastname: "", email: "", password: "" });
    }
  }, [isOpen]);

  /* ── Connexion ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();

      if (res.status === 403) {
        setError("Votre compte prestataire est en cours de validation (24-48h).");
        return;
      }
      if (!res.ok) {
        setError(data.message || "Email ou mot de passe incorrect");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      onAuthSuccess(data.token, data.user);

    } catch {
      setError("Erreur serveur, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Inscription avec coordonnées par défaut ── */
  const handleSignup = async (e) => {
    e.preventDefault();
    if (signupForm.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("firstname", signupForm.firstname);
      fd.append("lastname",  signupForm.lastname);
      fd.append("email",     signupForm.email);
      fd.append("password",  signupForm.password);
      fd.append("role",      "organisateur");

      const defaultLocation = {
        type: "Point",
        coordinates: [10.1815, 36.8065],
      };
      fd.append("location", JSON.stringify(defaultLocation));
      fd.append("locationName", "Tunis, Tunisie");

      const res  = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Erreur lors de la création du compte");
        return;
      }

      /* Auto-login après inscription */
      const loginRes  = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupForm.email, password: signupForm.password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError("Compte créé mais connexion automatique échouée. Veuillez vous connecter.");
        setTab("login");
        return;
      }

      localStorage.setItem("token", loginData.token);
      localStorage.setItem("user", JSON.stringify(loginData.user));

      onAuthSuccess(loginData.token, loginData.user);

    } catch (err) {
      console.error("Signup error:", err);
      setError("Erreur serveur, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Login ── */
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError("Pas de token reçu de Google");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/google", {
        token: credentialResponse.credential,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      onAuthSuccess(res.data.token, res.data.user);
    } catch (err) {
      setError("Erreur connexion Google : " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Connexion Google échouée. Veuillez réessayer.");
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes authModalIn {
          from { opacity: 0; transform: scale(.92) translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes authFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{
          background: "rgba(10,10,30,.72)",
          backdropFilter: "blur(10px)",
          animation: "authFadeIn .2s ease",
        }}
        onClick={onClose}
      >
        {/* Card */}
        <div
          className="w-full max-w-[400px] rounded-3xl bg-white overflow-hidden shadow-2xl"
          style={{ animation: "authModalIn .25s cubic-bezier(.34,1.56,.64,1)" }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ background: "linear-gradient(135deg,#1e1b4b,#4338CA)" }}
          >
            <div className="flex items-center gap-2 text-white">
              <Ic.lock width={16} height={16} className="opacity-80" />
              <span className="font-bold text-sm">
                {tab === "login"
                  ? "Connexion requise pour envoyer"
                  : "Créer un compte pour envoyer"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition"
            >
              <Ic.close width={15} height={15} />
            </button>
          </div>

          {/* ── Resource context badge ── */}
          {pendingItem && (
            <div
              className="mx-5 mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: "#EEF2FF", color: "#3730A3" }}
            >
              <Ic.info width={13} height={13} className="flex-shrink-0" />
              <span>Demande pour&nbsp;: <strong>{pendingItem.resourceName}</strong></span>
              <TypeBadge type={pendingItem.type || "service"} />
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex mx-5 mt-4 border-b border-gray-100">
            {[["login", "Connexion"], ["signup", "Inscription"]].map(([t, label]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-all border-b-2"
                style={{
                  color: tab === t ? "#4338CA" : "#9CA3AF",
                  borderBottomColor: tab === t ? "#4338CA" : "transparent",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-5 py-5">

            {/* ── Error banner ── */}
            {error && (
              <div
                className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: "#FEF2F2", color: "#991B1B" }}
              >
                <Ic.xmark width={13} height={13} />
                {error}
              </div>
            )}

            {/* ── Google Login button ── */}
            <div className="mb-4">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                width="360"
                text="continue_with"
                shape="rectangular"
                theme="outline"
                locale="fr"
              />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* ══════════════ LOGIN FORM ══════════════ */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-3">
                <Field label="Email" required>
                  <input
                    type="email"
                    placeholder="vous@exemple.com"
                    value={loginForm.email}
                    onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    className={fieldCls(false)}
                    required
                  />
                </Field>

                <Field label="Mot de passe" required>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                      className={cx(fieldCls(false), "pr-10")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd
                        ? <Ic.eyeOff width={15} height={15} />
                        : <Ic.eye width={15} height={15} />}
                    </button>
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#4338CA,#6366F1)" }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <Ic.send width={13} height={13} />
                      Se connecter et continuer
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Pas de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => { setTab("signup"); setError(""); }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    S'inscrire
                  </button>
                </p>
              </form>
            )}

            {/* ══════════════ SIGNUP FORM ══════════════ */}
            {tab === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" required>
                    <input
                      type="text"
                      placeholder="Sophie"
                      value={signupForm.firstname}
                      onChange={e => setSignupForm(p => ({ ...p, firstname: e.target.value }))}
                      className={fieldCls(false)}
                      required
                    />
                  </Field>
                  <Field label="Nom" required>
                    <input
                      type="text"
                      placeholder="Martin"
                      value={signupForm.lastname}
                      onChange={e => setSignupForm(p => ({ ...p, lastname: e.target.value }))}
                      className={fieldCls(false)}
                      required
                    />
                  </Field>
                </div>

                <Field label="Email" required>
                  <input
                    type="email"
                    placeholder="vous@exemple.com"
                    value={signupForm.email}
                    onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))}
                    className={fieldCls(false)}
                    required
                  />
                </Field>

                <Field label="Mot de passe" required>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))}
                      className={cx(fieldCls(false), "pr-10")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd
                        ? <Ic.eyeOff width={15} height={15} />
                        : <Ic.eye width={15} height={15} />}
                    </button>
                  </div>
                </Field>

                <p className="text-[10px] text-gray-400">
                  En créant un compte vous acceptez les conditions d'utilisation.
                  Compte créé en tant qu'organisateur.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#4338CA,#6366F1)" }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Ic.check width={13} height={13} />
                      Créer mon compte et continuer
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => { setTab("login"); setError(""); }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  );
}