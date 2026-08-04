use std::{
    fs,
    path::{Path, PathBuf},
};

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownFile {
    path: String,
    file_name: String,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WrittenMarkdownFile {
    path: String,
    file_name: String,
    bytes_written: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalImage {
    path: String,
    file_name: String,
    media_type: String,
    data_url: String,
}

#[tauri::command]
pub async fn pick_export_folder(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let folder_path = app
            .dialog()
            .file()
            .blocking_pick_folder();

        match folder_path {
            Some(folder_path) => {
                let path = folder_path
                    .into_path()
                    .map_err(|err| format!("Selected folder path is not available: {err}"))?;
                Ok(Some(display_path(&path)))
            }
            None => Ok(None),
        }
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn get_default_export_folder(app: AppHandle) -> Result<String, String> {
    if let Ok(downloads_dir) = app.path().download_dir() {
        return Ok(display_path(&downloads_dir));
    }
    if let Ok(desktop_dir) = app.path().desktop_dir() {
        return Ok(display_path(&desktop_dir));
    }
    if let Ok(home_dir) = app.path().home_dir() {
        return Ok(display_path(&home_dir.join("Downloads")));
    }
    Ok(display_path(&std::env::current_dir().unwrap_or_default()))
}

#[tauri::command]
pub async fn save_export_file(
    app: AppHandle,
    folder_path: String,
    subfolder_name: String,
    file_name: String,
    base64_data: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let raw_folder = folder_path.trim();
        if raw_folder.is_empty() {
            return Err("An export root folder must be selected first".to_string());
        }

        let root_dir = expand_tilde(&app, Path::new(raw_folder));
        fs::create_dir_all(&root_dir).map_err(|err| {
            format!(
                "Failed to create export root folder {}: {err}",
                root_dir.display()
            )
        })?;

        let raw_subfolder = subfolder_name.trim();
        if raw_subfolder.is_empty()
            || raw_subfolder == "."
            || raw_subfolder == ".."
            || raw_subfolder.contains('/')
            || raw_subfolder.contains('\\')
        {
            return Err("Invalid export subfolder name".to_string());
        }

        let target_dir = root_dir.join(raw_subfolder);
        fs::create_dir_all(&target_dir).map_err(|err| {
            format!(
                "Failed to create export subfolder {}: {err}",
                target_dir.display()
            )
        })?;

        let file_path = target_dir.join(&file_name);
        let bytes = general_purpose::STANDARD
            .decode(&base64_data)
            .map_err(|err| format!("Failed to decode base64 binary data: {err}"))?;

        fs::write(&file_path, &bytes)
            .map_err(|err| format!("Failed to write export file {}: {err}", file_path.display()))?;

        Ok(display_path(&file_path))
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn open_export_folder(app: AppHandle, path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = expand_tilde(&app, Path::new(&path));
        let target = if p.is_file() {
            p.parent().unwrap_or(&p).to_path_buf()
        } else {
            p
        };

        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open").arg(&target).spawn();
        }

        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("explorer").arg(&target).spawn();
        }

        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("xdg-open").arg(&target).spawn();
        }

        Ok(())
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn pick_markdown_file(app: AppHandle) -> Result<Option<MarkdownFile>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file_path = app
            .dialog()
            .file()
            .add_filter("Markdown", &["md", "markdown", "mdown", "mkd", "txt"])
            .blocking_pick_file();

        match file_path {
            Some(file_path) => {
                let path = file_path
                    .into_path()
                    .map_err(|err| format!("Selected file path is not available: {err}"))?;
                read_markdown_path(&path).map(Some)
            }
            None => Ok(None),
        }
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn open_markdown_file(app: AppHandle) -> Result<Option<MarkdownFile>, String> {
    pick_markdown_file(app).await
}

#[tauri::command]
pub async fn read_markdown_file(path: String) -> Result<MarkdownFile, String> {
    tauri::async_runtime::spawn_blocking(move || read_markdown_path(Path::new(&path)))
        .await
        .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn write_markdown_file(
    app: AppHandle,
    path: String,
    content: String,
) -> Result<WrittenMarkdownFile, String> {
    tauri::async_runtime::spawn_blocking(move || {
        write_markdown_path(&app, Path::new(&path), &content)
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn save_markdown_file(
    app: AppHandle,
    path: Option<String>,
    content: String,
) -> Result<Option<WrittenMarkdownFile>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let target_path = match path.as_deref().filter(|path| !path.trim().is_empty()) {
            Some(path) => expand_tilde(&app, Path::new(path)),
            None => {
                let file_path = app
                    .dialog()
                    .file()
                    .add_filter("Markdown", &["md", "markdown", "mdown", "mkd", "txt"])
                    .blocking_save_file();

                match file_path {
                    Some(file_path) => file_path
                        .into_path()
                        .map_err(|err| format!("Selected file path is not available: {err}"))?,
                    None => return Ok(None),
                }
            }
        };

        write_markdown_path(&app, &target_path, &content).map(Some)
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn resolve_local_image(
    app: AppHandle,
    path: String,
    base_path: Option<String>,
) -> Result<LocalImage, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let clean_path_str = path.trim().trim_start_matches("file://");

        if is_remote_or_data_url(clean_path_str) {
            return Err("Only local image paths can be resolved by the backend".to_string());
        }

        let raw_p = Path::new(clean_path_str);
        let p = expand_tilde(&app, raw_p);

        let resolved = if p.is_absolute() && p.exists() {
            p
        } else if p.is_absolute() {
            p
        } else {
            let base = base_path
                .as_deref()
                .map(Path::new)
                .ok_or_else(|| "A base path is required for relative image paths".to_string())?;
            let base_dir = if base.is_dir() {
                base
            } else {
                base.parent()
                    .ok_or_else(|| format!("Base path has no parent directory: {}", base.display()))?
            };

            let candidate = base_dir.join(&p);
            if candidate.exists() {
                candidate
            } else if let Some(parent) = base_dir.parent() {
                let candidate2 = parent.join(&p);
                if candidate2.exists() {
                    candidate2
                } else {
                    candidate
                }
            } else {
                candidate
            }
        };

        let media_type = image_media_type(&resolved)?;
        let bytes = fs::read(&resolved)
            .map_err(|err| format!("Failed to read image file {}: {err}", resolved.display()))?;
        let encoded = general_purpose::STANDARD.encode(bytes);

        Ok(LocalImage {
            path: display_path(&resolved),
            file_name: file_name(&resolved),
            media_type: media_type.to_string(),
            data_url: format!("data:{media_type};base64,{encoded}"),
        })
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

fn write_markdown_path(
    app: &AppHandle,
    path: &Path,
    content: &str,
) -> Result<WrittenMarkdownFile, String> {
    let path = expand_tilde(app, path);
    validate_markdown_path(&path)?;

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err(format!(
                "Parent directory does not exist: {}",
                parent.display()
            ));
        }
    }

    fs::write(&path, content.as_bytes())
        .map_err(|err| format!("Failed to write Markdown file {}: {err}", path.display()))?;

    Ok(WrittenMarkdownFile {
        path: display_path(&path),
        file_name: file_name(&path),
        bytes_written: content.len(),
    })
}

fn read_markdown_path(path: &Path) -> Result<MarkdownFile, String> {
    validate_markdown_path(path)?;
    let content = fs::read_to_string(path)
        .map_err(|err| format!("Failed to read Markdown file {}: {err}", path.display()))?;

    Ok(MarkdownFile {
        path: display_path(path),
        file_name: file_name(path),
        content,
    })
}

fn validate_markdown_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase());

    match extension.as_deref() {
        Some("md" | "markdown" | "mdown" | "mkd") => Ok(()),
        _ => Err(format!("Not a supported Markdown file: {}", path.display())),
    }
}

fn image_media_type(path: &Path) -> Result<&'static str, String> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase());

    match extension.as_deref() {
        Some("apng") => Ok("image/apng"),
        Some("avif") => Ok("image/avif"),
        Some("gif") => Ok("image/gif"),
        Some("jpg" | "jpeg" | "jfif" | "pjpeg" | "pjp") => Ok("image/jpeg"),
        Some("png") => Ok("image/png"),
        Some("svg") => Ok("image/svg+xml"),
        Some("webp") => Ok("image/webp"),
        Some("bmp") => Ok("image/bmp"),
        Some("ico") => Ok("image/x-icon"),
        Some("tiff" | "tif") => Ok("image/tiff"),
        _ => Ok("image/png"),
    }
}

fn is_remote_or_data_url(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("data:")
        || lower.starts_with("blob:")
}

fn expand_tilde(app: &AppHandle, path: &Path) -> PathBuf {
    let path_string = path.to_string_lossy();
    if path_string == "~" {
        return app.path().home_dir().unwrap_or_else(|_| path.to_path_buf());
    }

    if let Some(rest) = path_string.strip_prefix("~/") {
        if let Ok(home_dir) = app.path().home_dir() {
            return home_dir.join(rest);
        }
    }

    path.to_path_buf()
}

fn display_path(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|file_name| file_name.to_str())
        .unwrap_or_default()
        .to_string()
}
