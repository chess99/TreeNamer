// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod test {
    pub use crate::commands::test::*;
}

fn main() {
    // Run our test for the improved rename detection algorithm
    #[cfg(debug_assertions)]
    {
        println!("Running rename detection algorithm test...");
        test::test_generate_operations();
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::parse_directory,
            commands::apply_operations,
            commands::is_protected_path,
            commands::create_backup,
            commands::list_backups,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
