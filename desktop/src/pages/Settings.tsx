import { useState } from "react";
import { Link } from "react-router-dom";

export function Settings() {
  const [language, setLanguage] = useState("en");

  return (
    <div className="flex-1 overflow-y-auto w-full bg-background-dark">
      <div className="max-w-4xl mx-auto p-6 md:p-10 lg:p-12 pb-24">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-text-secondary">Manage your application preferences.</p>
        </header>

        <div className="space-y-8">
          {/* General Settings */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-8">General</h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-white">Language</label>
                <p className="text-xs text-text-secondary mb-2">Select your preferred language for the interface.</p>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full md:w-1/2 bg-background-dark border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </section>

          {/* Profile Link */}
          <section className="bg-surface-dark border border-white/5 rounded-3xl p-6 md:p-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Profile Settings</h2>
              <p className="text-text-secondary text-sm">Update your personal information and account security.</p>
            </div>
            <Link 
              to="/profile" 
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/5 text-sm"
            >
              <span>Edit Profile</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
