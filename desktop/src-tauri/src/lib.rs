#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        use tauri::menu::Menu;
        use tauri::Manager;
        let menu = Menu::default(app.handle())?;
        app.set_menu(menu)?;

        if let Some(window) = app.get_webview_window("main") {
            // Restore native decorations for macOS
            let _ = window.set_decorations(true);
            // Ensure title bar is visible (standard macOS look)
            let _ = window.set_title_bar_style(tauri::TitleBarStyle::Visible);
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
