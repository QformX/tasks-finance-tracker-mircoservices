#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        use tauri::menu::{Menu, Submenu, PredefinedMenuItem, AboutMetadata};
        let handle = app.handle();
        let app_name = &app.package_info().name;

        // App Menu
        let app_menu = Submenu::new(handle, "App", true)?;
        app_menu.append(&PredefinedMenuItem::about(handle, Some(app_name), Some(AboutMetadata::default()))?)?;
        app_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        app_menu.append(&PredefinedMenuItem::hide(handle, None)?)?;
        app_menu.append(&PredefinedMenuItem::hide_others(handle, None)?)?;
        app_menu.append(&PredefinedMenuItem::quit(handle, None)?)?;

        // Edit Menu (Required for inputs!)
        let edit_menu = Submenu::new(handle, "Edit", true)?;
        edit_menu.append(&PredefinedMenuItem::undo(handle, None)?)?;
        edit_menu.append(&PredefinedMenuItem::redo(handle, None)?)?;
        edit_menu.append(&PredefinedMenuItem::separator(handle)?)?;
        edit_menu.append(&PredefinedMenuItem::cut(handle, None)?)?;
        edit_menu.append(&PredefinedMenuItem::copy(handle, None)?)?;
        edit_menu.append(&PredefinedMenuItem::paste(handle, None)?)?;
        edit_menu.append(&PredefinedMenuItem::select_all(handle, None)?)?;

        let menu = Menu::with_items(handle, &[&app_menu, &edit_menu])?;
        app.set_menu(menu)?;
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
