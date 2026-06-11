import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { setTokens } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Authorization code is missing.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/callback`;
        const response = await fetch("http://127.0.0.1:80/auth/yandex/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Server responded with ${response.status}`);
        }

        const data = await response.json();
        setTokens(data);
        // Redirect to homepage which will checkAuth
        window.location.href = "/";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    exchangeCode();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-surface p-8 border border-text-950/5 shadow-xl text-center">
        {error ? (
          <>
            <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
            <h2 className="text-2xl font-bold text-text-950 mt-4">{t("error")}</h2>
            <p className="text-sm text-text-secondary mt-2">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 inline-block w-full rounded-full bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-bold text-text-950 mt-6">{t("loading")}</h2>
            <p className="text-sm text-text-secondary mt-2">Completing Yandex sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
}
