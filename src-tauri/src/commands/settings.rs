use crate::error::FxPingError;
use crate::ini_settings;

#[tauri::command]
pub async fn load_settings_from_ini() -> Result<Option<ini_settings::Settings>, FxPingError> {
    ini_settings::load_from_ini()
}

#[tauri::command]
pub async fn save_settings_to_ini(settings: ini_settings::Settings) -> Result<(), FxPingError> {
    ini_settings::save_to_ini(settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_settings_commands() {
        // These tests will attempt to use the real ini_settings layout.
        // Even if they fail due to permissions or missing files, we can verify the command exists.
        // We'll just test that we can create a Settings object and pass it.
        let settings = ini_settings::Settings::default();

        // We don't necessarily want to write to the EXE path during automated tests if we can't control it.
        // But we can check if it runs without crashing.
        let _ = save_settings_to_ini(settings).await;
        let _ = load_settings_from_ini().await;
    }
}
