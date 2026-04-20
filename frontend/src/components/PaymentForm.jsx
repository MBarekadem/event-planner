import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51TNBjcRqjNGfrecsmctWpoSvbhepNtLN3BB3Suu95rFDQxHxxgSoIIyoWMJzQ1sD39F4Ddvi0PynxJp8zqECQe9m00K8iR1o62");

const makeElementStyle = (focused) => ({
    style: {
        base: {
            fontSize: "14px",
            fontFamily: "'Courier New', monospace",
            color: "#1f2937",
            letterSpacing: "0.04em",
            "::placeholder": { color: focused ? "#c7d2fe" : "#9ca3af" },
        },
        invalid: { color: "#ef4444" },
    },
});

// ─── Carte animée ─────────────────────────────────────────────────────────────
function AnimatedCard({ name, expiry, flipped, cardState, expiryState, activeField }) {
    const isNumberActive = activeField === "number";
    const isExpiryActive = activeField === "expiry";
    const isNameActive   = activeField === "name";
    const numberDisplay  = cardState === "complete" ? "•••• •••• •••• ••••" : "#### #### #### ####";
    const expiryDisplay  = expiryState === "complete" ? expiry : "MM / YY";
    const nameDisplay    = name.trim() || "FULL NAME";

    return (
        <div style={{ perspective: "1200px", width: 340, height: 200 }}>
            <div style={{
                width: "100%", height: "100%", position: "relative",
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 0.65s cubic-bezier(0.23, 1, 0.32, 1)",
            }}>
                {/* ══ FRONT ══ */}
                <div style={{
                    position: "absolute", inset: 0, backfaceVisibility: "hidden",
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)",
                    boxShadow: "0 30px 60px rgba(30,58,138,0.55), 0 12px 24px rgba(0,0,0,0.3)",
                    padding: 28, display: "flex", flexDirection: "column",
                    justifyContent: "space-between", overflow: "hidden",
                }}>
                    {/* Cercles déco */}
                    <div style={{ position: "absolute", right: -30, top: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ position: "absolute", right: 20, top: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

                    {/* Top */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                        <div style={{
                            width: 42, height: 30, borderRadius: 6,
                            background: "linear-gradient(135deg, #fde68a, #d97706)",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.2)",
                            position: "relative", overflow: "hidden",
                        }}>
                            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(120,80,0,0.25)" }} />
                            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(120,80,0,0.25)" }} />
                            <div style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderRadius: 2, border: "1px solid rgba(120,80,0,0.15)" }} />
                        </div>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.7 }}>
                            <path d="M5.5 12c0-3.59 2.91-6.5 6.5-6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                            <path d="M3 12c0-4.97 4.03-9 9-9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.6"/>
                            <path d="M8 12c0-2.21 1.79-4 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.85"/>
                            <circle cx="12" cy="12" r="1.5" fill="white"/>
                        </svg>
                    </div>

                    {/* Numéro */}
                    <div style={{
                        fontFamily: "'Courier New', monospace", fontSize: 18,
                        letterSpacing: "0.2em", color: "white",
                        textShadow: "0 1px 4px rgba(0,0,0,0.4)", padding: "4px 0",
                        borderBottom: isNumberActive ? "2px solid rgba(165,180,252,0.9)" : "2px solid transparent",
                        transition: "border-color 0.3s",
                        position: "relative",
                    }}>
                        {numberDisplay}
                        {isNumberActive && (
                            <div style={{
                                position: "absolute", bottom: -1, left: 0, height: 2, width: "40%",
                                background: "linear-gradient(90deg, #a5b4fc, transparent)",
                                animation: "shimmer 1.2s ease-in-out infinite",
                            }} />
                        )}
                    </div>

                    {/* Bottom */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                            <div style={{ fontSize: 9, color: "rgba(165,180,252,0.8)", letterSpacing: "0.15em", marginBottom: 4, textTransform: "uppercase" }}>Card Holder</div>
                            <div style={{
                                fontSize: 13, color: "white", fontWeight: 600,
                                letterSpacing: "0.05em", maxWidth: 160, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                borderBottom: isNameActive ? "2px solid rgba(165,180,252,0.9)" : "2px solid transparent",
                                transition: "border-color 0.3s", paddingBottom: 2,
                            }}>
                                {nameDisplay}
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 9, color: "rgba(165,180,252,0.8)", letterSpacing: "0.15em", marginBottom: 4, textTransform: "uppercase" }}>Expires</div>
                            <div style={{
                                fontSize: 13, color: "white", fontWeight: 600,
                                letterSpacing: "0.05em",
                                borderBottom: isExpiryActive ? "2px solid rgba(165,180,252,0.9)" : "2px solid transparent",
                                transition: "border-color 0.3s", paddingBottom: 2,
                            }}>
                                {expiryDisplay}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ BACK ══ */}
                <div style={{
                    position: "absolute", inset: 0, backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)", borderRadius: 20,
                    background: "linear-gradient(135deg, #1e40af, #1e3a8a)",
                    boxShadow: "0 30px 60px rgba(30,58,138,0.55), 0 12px 24px rgba(0,0,0,0.3)",
                    overflow: "hidden",
                }}>
                    <div style={{ width: "100%", height: 44, background: "rgba(0,0,0,0.7)", marginTop: 28 }} />
                    <div style={{ padding: "14px 28px" }}>
                        <div style={{ fontSize: 9, color: "rgba(165,180,252,0.8)", letterSpacing: "0.15em", marginBottom: 6, textTransform: "uppercase" }}>CVV</div>
                        <div style={{
                            background: "white", borderRadius: 6, padding: "8px 16px",
                            fontFamily: "'Courier New', monospace", fontSize: 15,
                            color: "#1f2937", letterSpacing: "0.25em", textAlign: "right",
                            boxShadow: flipped ? "0 0 0 3px rgba(165,180,252,0.5)" : "none",
                            transition: "box-shadow 0.3s",
                        }}>
                            •••
                        </div>
                    </div>
                    <div style={{ position: "absolute", bottom: 20, right: 24, display: "flex" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239,68,68,0.8)" }} />
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(251,191,36,0.8)", marginLeft: -10 }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, focused, complete, children }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{
                fontSize: 11, fontWeight: 700,
                color: focused ? "#4338ca" : "#6b7280",
                textTransform: "uppercase", letterSpacing: "0.1em",
                transition: "color 0.2s",
            }}>
                {label}
            </label>
            <div style={{
                padding: "12px 16px", borderRadius: 12,
                border: `1.5px solid ${error ? "#f87171" : focused ? "#6366f1" : complete ? "#34d399" : "#e5e7eb"}`,
                background: focused ? "#fafafe" : "#f9fafb",
                boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : error ? "0 0 0 3px rgba(248,113,113,0.1)" : "none",
                transition: "all 0.25s",
            }}>
                {children}
            </div>
            {error && <span style={{ fontSize: 11, color: "#ef4444" }}>⚠ {error}</span>}
        </div>
    );
}

// ─── CheckoutForm ─────────────────────────────────────────────────────────────
function CheckoutForm({ amount, locationId }) {
    const stripe   = useStripe();
    const elements = useElements();
    const navigate = useNavigate();

    const [name, setName]               = useState("");
    const [expiry, setExpiry]           = useState("");
    const [errors, setErrors]           = useState({});
    const [loading, setLoading]         = useState(false);
    const [success, setSuccess]         = useState(false);
    const [activeField, setActiveField] = useState(null);
    const [cardState, setCardState]     = useState("empty");
    const [expiryState, setExpiryState] = useState("empty");
    const [cvcState, setCvcState]       = useState("empty");

    const flipped = activeField === "cvc";

    const validate = () => {
        const errs = {};
        if (!name.trim()) errs.name = "Nom du titulaire requis.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handlePay = async () => {
        if (!stripe || !elements) return;
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, locationId }),
            });
            const data = await res.json();
            if (!data.clientSecret) { setErrors({ global: "Erreur serveur" }); setLoading(false); return; }

            const cardNumberElement = elements.getElement(CardNumberElement);
            const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                payment_method: { card: cardNumberElement, billing_details: { name } },
            });

            if (error) { setErrors({ global: error.message }); setLoading(false); return; }

            if (paymentIntent.status === "succeeded") {
                const token = localStorage.getItem("token");
                await fetch("http://localhost:5000/api/location/pay", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ locationId, amount }),
                });
                setSuccess(true);
            }
        } catch (err) {
            setErrors({ global: "Une erreur est survenue. Réessayez." });
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #ede9fe 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, width: "100%", maxWidth: 440 }}>

                {/* Carte */}
                <AnimatedCard
                    name={name} expiry={expiry} flipped={flipped}
                    cardState={cardState} expiryState={expiryState} activeField={activeField}
                />

                {/* Formulaire */}
                <div style={{
                    background: "white", borderRadius: 24, width: "100%",
                    boxShadow: "0 24px 64px rgba(67,56,202,0.12), 0 4px 16px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(99,102,241,0.1)", padding: 32,
                }}>
                    {!success ? (
                        <>
                            {/* Header */}
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        background: "linear-gradient(135deg,#4338ca,#6366f1)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                            <rect x="1" y="4" width="22" height="16" rx="2"/>
                                            <line x1="1" y1="10" x2="23" y2="10"/>
                                        </svg>
                                    </div>
                                    <h2 style={{ fontSize: 19, fontWeight: 800, color: "#111827", margin: 0 }}>Paiement sécurisé</h2>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 2 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                                    </svg>
                                    <span style={{ fontSize: 12, color: "#6b7280" }}>SSL · Stripe</span>
                                    <span style={{ fontSize: 12, color: "#d1d5db" }}>·</span>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: "#4338ca" }}>{amount} €</span>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                                <Field label="Numéro de carte" error={errors.number} focused={activeField === "number"} complete={cardState === "complete"}>
                                    <CardNumberElement
                                        options={makeElementStyle(activeField === "number")}
                                        onFocus={() => setActiveField("number")}
                                        onBlur={() => setActiveField(null)}
                                        onChange={(e) => {
                                            setCardState(e.complete ? "complete" : e.empty ? "empty" : "partial");
                                            setErrors(er => ({ ...er, number: e.error?.message || "" }));
                                        }}
                                    />
                                </Field>

                                <div style={{ display: "flex", gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <Field label="Expiration" error={errors.expiry} focused={activeField === "expiry"} complete={expiryState === "complete"}>
                                            <CardExpiryElement
                                                options={makeElementStyle(activeField === "expiry")}
                                                onFocus={() => setActiveField("expiry")}
                                                onBlur={() => setActiveField(null)}
                                                onChange={(e) => {
                                                    if (e.complete) {
                                                        setExpiryState("complete");
                                                        if (e.value) {
                                                            const mm = String(e.value.month).padStart(2, "0");
                                                            const yy = String(e.value.year).slice(-2);
                                                            setExpiry(`${mm} / ${yy}`);
                                                        }
                                                    } else {
                                                        setExpiryState(e.empty ? "empty" : "partial");
                                                    }
                                                    setErrors(er => ({ ...er, expiry: e.error?.message || "" }));
                                                }}
                                            />
                                        </Field>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Field label="CVV" error={errors.cvc} focused={activeField === "cvc"} complete={cvcState === "complete"}>
                                            <CardCvcElement
                                                options={makeElementStyle(activeField === "cvc")}
                                                onFocus={() => setActiveField("cvc")}
                                                onBlur={() => setActiveField(null)}
                                                onChange={(e) => {
                                                    setCvcState(e.complete ? "complete" : e.empty ? "empty" : "partial");
                                                    setErrors(er => ({ ...er, cvc: e.error?.message || "" }));
                                                }}
                                            />
                                        </Field>
                                    </div>
                                </div>

                                <Field label="Nom du titulaire" error={errors.name} focused={activeField === "name"} complete={name.trim().length > 2}>
                                    <input
                                        type="text" placeholder="JEAN DUPONT" value={name}
                                        onFocus={() => setActiveField("name")}
                                        onBlur={() => setActiveField(null)}
                                        onChange={(e) => {
                                            setName(e.target.value.toUpperCase());
                                            if (errors.name) setErrors(er => ({ ...er, name: "" }));
                                        }}
                                        style={{
                                            width: "100%", border: "none", outline: "none",
                                            background: "transparent", fontSize: 14,
                                            fontFamily: "'Courier New', monospace",
                                            letterSpacing: "0.04em", color: "#1f2937",
                                        }}
                                    />
                                </Field>

                                {/* Barre de progression */}
                                <div style={{ display: "flex", gap: 6 }}>
                                    {[
                                        { state: cardState, label: "N° carte" },
                                        { state: expiryState, label: "Expiration" },
                                        { state: cvcState, label: "CVV" },
                                        { state: name.trim().length > 2 ? "complete" : name ? "partial" : "empty", label: "Nom" },
                                    ].map(({ state, label }) => (
                                        <div key={label} style={{ flex: 1, textAlign: "center" }}>
                                            <div style={{
                                                height: 3, borderRadius: 99, marginBottom: 4,
                                                background: state === "complete" ? "#34d399" : state === "partial" ? "#fbbf24" : "#e5e7eb",
                                                transition: "background 0.35s",
                                            }} />
                                            <span style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {errors.global && (
                                    <div style={{
                                        background: "#fef2f2", border: "1px solid #fecaca",
                                        borderRadius: 10, padding: "10px 14px",
                                        fontSize: 12, color: "#dc2626",
                                    }}>
                                        ⚠ {errors.global}
                                    </div>
                                )}

                                <button
                                    onClick={handlePay}
                                    disabled={loading || !stripe}
                                    style={{
                                        marginTop: 4, width: "100%", padding: "14px 0",
                                        borderRadius: 14, border: "none",
                                        background: "linear-gradient(135deg,#4338ca,#6366f1)",
                                        color: "white", fontSize: 15, fontWeight: 700,
                                        cursor: loading ? "not-allowed" : "pointer",
                                        boxShadow: "0 8px 24px rgba(67,56,202,0.4)",
                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                        opacity: loading ? 0.85 : 1, transition: "opacity 0.2s",
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div style={{
                                                width: 16, height: 16,
                                                border: "2px solid rgba(255,255,255,0.3)",
                                                borderTop: "2px solid white",
                                                borderRadius: "50%",
                                                animation: "spin 0.7s linear infinite",
                                            }} />
                                            Traitement…
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                                <rect x="1" y="4" width="22" height="16" rx="2"/>
                                                <line x1="1" y1="10" x2="23" y2="10"/>
                                            </svg>
                                            Payer {amount} €
                                        </>
                                    )}
                                </button>

                                <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", margin: 0 }}>
                                    Test : <span style={{ fontFamily: "monospace" }}>4242 4242 4242 4242</span> · 12/34 · 123
                                </p>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 0", gap: 16 }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: "50%",
                                background: "linear-gradient(135deg,#059669,#065f46)",
                                boxShadow: "0 12px 32px rgba(5,150,105,0.4)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                animation: "popIn 0.5s cubic-bezier(.2,1.4,.4,1)",
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>Paiement réussi !</h3>
                                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Facture générée. Retrouvez-la dans vos réservations.</p>
                            </div>
                            <button
                                onClick={() => navigate("/mes-reservations")}
                                style={{
                                    marginTop: 8, padding: "12px 28px", borderRadius: 12, border: "none",
                                    background: "linear-gradient(135deg,#4338ca,#6366f1)",
                                    color: "white", fontWeight: 700, fontSize: 14,
                                    cursor: "pointer", boxShadow: "0 6px 18px rgba(67,56,202,0.35)",
                                }}
                            >
                                Voir mes réservations →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes popIn { from { transform: scale(0) rotate(-10deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
                @keyframes shimmer { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
            `}</style>
        </div>
    );
}

export default function PaymentForm() {
    const location   = useLocation();
    const amount     = location.state?.amount || 0;
    const locationId = location.state?.locationId;
    return (
        <Elements stripe={stripePromise}>
            <CheckoutForm amount={amount} locationId={locationId} />
        </Elements>
    );
}