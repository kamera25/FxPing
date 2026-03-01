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
