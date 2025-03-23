// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
#[cfg(test)]
mod test {
    // Public test module for integration tests
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Test execution should only happen when explicitly running tests, not during normal app usage
    // Removing automatic test execution from app startup

    println!("Starting TreeNamer application...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            println!("Tauri app setup complete");
            Ok(())
        })
        // Configure Tauri to handle snake_case in Rust to camelCase in JavaScript conversion
        .invoke_handler(tauri::generate_handler![
            commands::parse_directory,
            commands::apply_operations,
            commands::is_protected_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}
