import { Link } from "react-router-dom";
import { Dropdown } from "@/components/Dropdown";
import { useLanguage } from "@/context/LanguageContext";

export function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-dark">
      <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-12 pb-24">
        <header className="mb-10">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{t("settings_title")}</h1>
          <p className="text-text-secondary">{t("settings_desc")}</p>
        </header>

        <div className="space-y-8">
          {/* General Settings */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-8">{t("general")}</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-white">{t("language")}</label>
                <p className="text-xs text-text-secondary mb-2">{t("language_desc")}</p>
                <Dropdown
                  className="w-full md:w-1/2"
                  items={[{ value: "en", label: "English" }, { value: "ru", label: "Русский" }]}
                  selectedItem={{ value: language, label: language === "en" ? "English" : "Русский" }}
                  onSelect={(item) => setLanguage(item.value as "en" | "ru")}
                  keyExtractor={(item) => item.value}
                  renderItem={(item) => item.label}
                />
              </div>
            </div>
          </section>

          {/* Profile Link */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl p-6 md:p-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{t("profile_settings")}</h2>
              <p className="text-text-secondary text-sm">{t("profile_settings_desc")}</p>
            </div>
            <Link 
              to="/profile" 
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/5 text-sm"
            >
              <span>{t("edit_profile")}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
