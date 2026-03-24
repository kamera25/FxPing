use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

pub mod commands;
mod error;
mod ini_settings;
mod pinger;
mod tcpip;
mod tracer;

pub use error::FxPingError;

// --- Security Policy ---
// このアプリケーションは、Ping（ICMP）および Traceroute 以外の外部通信を行わない設計になっています。
// フロントエンドは tauri.conf.json の CSP によって `connect-src 'none'` とされており、
// バックエンドでも HTTP/HTTPS ライブラリ（reqwest 等）の導入は制限されています。
// 新しい機能を追加する際は、不必要なネットワーク通信が発生しないよう十分注意してください。
// ------------------------

fn setup_menu(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let products_menu = Submenu::with_id_and_items(
        app,
        "product",
        "FxPing",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("FxPingについて"), None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, Some("サービス"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, Some("FxPingを隠す"))?,
            &PredefinedMenuItem::hide_others(app, Some("ほかを隠す"))?,
            &PredefinedMenuItem::show_all(app, Some("すべてを表示"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("FxPingを終了"))?,
        ],
    )?;

    let edit_menu = Submenu::with_id_and_items(
        app,
        "edit",
        "編集",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("元に戻す"))?,
            &PredefinedMenuItem::redo(app, Some("やり直し"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("切り取り"))?,
            &PredefinedMenuItem::copy(app, Some("コピー"))?,
            &PredefinedMenuItem::paste(app, Some("貼り付け"))?,
            &PredefinedMenuItem::select_all(app, Some("すべて選択"))?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(
        app,
        "help",
        "ヘルプ",
        true,
        &[&MenuItem::with_id(
            app,
            "view_help",
            "ヘルプを見る",
            true,
            None::<&str>,
        )?],
    )?;

    let menu = Menu::with_items(app, &[&products_menu, &edit_menu, &help_menu])?;

    app.set_menu(menu)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            setup_menu(app)?;
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .on_menu_event(|app, event| {
            if event.id == "view_help" {
                use tauri_plugin_opener::OpenerExt;
                let _ = app.opener().open_url(
                    "https://github.com/kamera25/FxPing/blob/main/assets/howtouse.md",
                    None::<&str>,
                );
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping::ping_target,
            commands::trace::traceroute_target,
            commands::ping::validate_host,
            commands::file::save_targets,
            commands::file::save_text_file,
            commands::file::append_text_file,
            commands::system::get_platform,
            commands::file::read_file_bytes,
            commands::system::is_admin,
            commands::system::show_main_window,
            commands::system::launch_external_program,
            commands::file::load_def_targets,
            commands::settings::load_settings_from_ini,
            commands::settings::save_settings_to_ini,
            commands::system::play_sound_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    #[test]
    fn test_csp_settings_for_audio() {
        // Find tauri.conf.json
        // Due to how Cargo runs tests, the current directory is usually the crate root (`src-tauri`).
        let config_path = PathBuf::from("tauri.conf.json");
        let content =
            std::fs::read_to_string(&config_path).expect("Failed to read tauri.conf.json");

        let json: serde_json::Value =
            serde_json::from_str(&content).expect("Failed to parse tauri.conf.json");

        let csp = json["app"]["security"]["csp"]
            .as_str()
            .expect("Failed to find app.security.csp in tauri.conf.json");

        assert!(
            csp.contains("media-src 'self' blob:"),
            "CSP does not contain media-src 'self' blob: for audio playback. Current CSP: {}",
            csp
        );

        // Also ensure connect-src 'none' is NOT present as it breaks Tauri IPC
        assert!(
            !csp.contains("connect-src 'none'"),
            "CSP should not contain connect-src 'none' as it breaks Tauri IPC. Current CSP: {}",
            csp
        );
    }
}
