/// Tauri v2 application setup.
///
/// Registers plugins for native file access, dialogs, and opening external resources.
/// The frontend handles all parsing and visualization; the Rust backend provides
/// platform-native I/O capabilities.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
