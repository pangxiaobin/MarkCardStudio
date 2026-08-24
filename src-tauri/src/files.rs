use std::{
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose, Engine as _};
use reqwest::{header::CONTENT_TYPE, redirect::Policy, Url};
use serde::{Deserialize, Serialize};
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

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFont {
    id: String,
    display_name: String,
    family: String,
    file_name: String,
    format: String,
    media_type: String,
    size: u64,
    created_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomFontData {
    font: CustomFont,
    data_url: String,
}

const MAX_CUSTOM_FONT_BYTES: u64 = 20 * 1024 * 1024;

#[tauri::command]
pub async fn pick_export_folder(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let folder_path = app.dialog().file().blocking_pick_folder();

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
pub async fn import_custom_font(app: AppHandle) -> Result<Option<CustomFont>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let selected_path = app
            .dialog()
            .file()
            .add_filter("Font", &["woff2", "woff", "ttf", "otf"])
            .blocking_pick_file();

        let Some(selected_path) = selected_path else {
            return Ok(None);
        };
        let source_path = selected_path
            .into_path()
            .map_err(|err| format!("Selected font path is not available: {err}"))?;
        let source_metadata = fs::metadata(&source_path).map_err(|err| {
            format!(
                "Failed to inspect font file {}: {err}",
                source_path.display()
            )
        })?;
        if !source_metadata.is_file() {
            return Err("Selected font path is not a file".to_string());
        }
        if source_metadata.len() == 0 || source_metadata.len() > MAX_CUSTOM_FONT_BYTES {
            return Err("Font files must be between 1 byte and 20 MB".to_string());
        }

        let bytes = fs::read(&source_path)
            .map_err(|err| format!("Failed to read font file {}: {err}", source_path.display()))?;
        let font_format = detect_font_format(&bytes)
            .ok_or_else(|| "Unsupported or invalid font file".to_string())?;
        let fonts_dir = custom_fonts_dir(&app)?;
        fs::create_dir_all(&fonts_dir).map_err(|err| {
            format!(
                "Failed to create custom font directory {}: {err}",
                fonts_dir.display()
            )
        })?;
        if let Some(existing_font) = find_duplicate_custom_font(&fonts_dir, &bytes)? {
            return Ok(Some(existing_font));
        }

        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let id = next_custom_font_id(&fonts_dir, created_at);
        let stored_font_path = fonts_dir.join(format!("{id}.{}", font_format.extension));
        let metadata_path = fonts_dir.join(format!("{id}.json"));
        let display_name = source_path
            .file_stem()
            .and_then(|name| name.to_str())
            .filter(|name| !name.trim().is_empty())
            .unwrap_or("Custom Font")
            .trim()
            .to_string();
        let font = CustomFont {
            id: id.clone(),
            display_name,
            family: format!("MarkCardUser_{id}"),
            file_name: file_name(&source_path),
            format: font_format.css_format.to_string(),
            media_type: font_format.media_type.to_string(),
            size: bytes.len() as u64,
            created_at,
        };
        let metadata_json = serde_json::to_vec_pretty(&font)
            .map_err(|err| format!("Failed to serialize custom font metadata: {err}"))?;

        fs::write(&stored_font_path, &bytes).map_err(|err| {
            format!(
                "Failed to store custom font {}: {err}",
                stored_font_path.display()
            )
        })?;
        if let Err(err) = fs::write(&metadata_path, metadata_json) {
            let _ = fs::remove_file(&stored_font_path);
            return Err(format!(
                "Failed to store custom font metadata {}: {err}",
                metadata_path.display()
            ));
        }

        Ok(Some(font))
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn list_custom_fonts(app: AppHandle) -> Result<Vec<CustomFont>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let fonts_dir = custom_fonts_dir(&app)?;
        if !fonts_dir.exists() {
            return Ok(Vec::new());
        }

        let mut fonts = Vec::new();
        let entries = fs::read_dir(&fonts_dir).map_err(|err| {
            format!(
                "Failed to read custom font directory {}: {err}",
                fonts_dir.display()
            )
        })?;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
                continue;
            }
            let Ok(bytes) = fs::read(&path) else {
                continue;
            };
            let Ok(font) = serde_json::from_slice::<CustomFont>(&bytes) else {
                continue;
            };
            if validate_custom_font_id(&font.id).is_ok()
                && stored_custom_font_path(&fonts_dir, &font).exists()
            {
                fonts.push(font);
            }
        }
        fonts.sort_by(|left, right| right.created_at.cmp(&left.created_at));
        Ok(fonts)
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn read_custom_font(app: AppHandle, font_id: String) -> Result<CustomFontData, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_custom_font_id(&font_id)?;
        let fonts_dir = custom_fonts_dir(&app)?;
        let font = read_custom_font_metadata(&fonts_dir, &font_id)?;
        let font_path = stored_custom_font_path(&fonts_dir, &font);
        let metadata = fs::metadata(&font_path).map_err(|err| {
            format!(
                "Failed to inspect custom font {}: {err}",
                font_path.display()
            )
        })?;
        if metadata.len() == 0 || metadata.len() > MAX_CUSTOM_FONT_BYTES {
            return Err("Stored font is empty or exceeds the 20 MB limit".to_string());
        }
        let bytes = fs::read(&font_path)
            .map_err(|err| format!("Failed to read custom font {}: {err}", font_path.display()))?;
        if detect_font_format(&bytes).is_none() {
            return Err("Stored custom font is invalid".to_string());
        }
        let encoded = general_purpose::STANDARD.encode(bytes);

        Ok(CustomFontData {
            data_url: format!("data:{};base64,{encoded}", font.media_type),
            font,
        })
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
}

#[tauri::command]
pub async fn delete_custom_font(app: AppHandle, font_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_custom_font_id(&font_id)?;
        let fonts_dir = custom_fonts_dir(&app)?;
        let font = read_custom_font_metadata(&fonts_dir, &font_id)?;
        let font_path = stored_custom_font_path(&fonts_dir, &font);
        let metadata_path = fonts_dir.join(format!("{font_id}.json"));

        if font_path.exists() {
            fs::remove_file(&font_path).map_err(|err| {
                format!(
                    "Failed to delete custom font {}: {err}",
                    font_path.display()
                )
            })?;
        }
        if metadata_path.exists() {
            fs::remove_file(&metadata_path).map_err(|err| {
                format!(
                    "Failed to delete custom font metadata {}: {err}",
                    metadata_path.display()
                )
            })?;
        }
        Ok(())
    })
    .await
    .map_err(|err| format!("Task execution failed: {err}"))?
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
        let clean_path_str = path.trim();

        if is_remote_or_data_url(clean_path_str) {
            return Err("Only local image paths can be resolved by the backend".to_string());
        }

        let raw_p = if clean_path_str.to_ascii_lowercase().starts_with("file://") {
            Url::parse(clean_path_str)
                .map_err(|err| format!("Invalid local image URL: {err}"))?
                .to_file_path()
                .map_err(|_| "Local image URL does not contain a valid file path".to_string())?
        } else {
            PathBuf::from(clean_path_str)
        };
        let p = expand_tilde(&app, &raw_p);

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
                base.parent().ok_or_else(|| {
                    format!("Base path has no parent directory: {}", base.display())
                })?
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

        if !resolved.is_file() {
            return Err(format!("Image file was not found: {}", resolved.display()));
        }

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

#[tauri::command]
pub async fn resolve_remote_image(url: String) -> Result<LocalImage, String> {
    const MAX_IMAGE_BYTES: u64 = 25 * 1024 * 1024;

    let parsed_url = Url::parse(url.trim()).map_err(|err| format!("Invalid image URL: {err}"))?;
    if !matches!(parsed_url.scheme(), "http" | "https") {
        return Err("Only HTTP and HTTPS image URLs are supported".to_string());
    }

    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(20))
        .redirect(Policy::limited(5))
        .build()
        .map_err(|err| format!("Failed to prepare image request: {err}"))?;

    let response = client
        .get(parsed_url.clone())
        .send()
        .await
        .map_err(|err| format!("Failed to download remote image: {err}"))?
        .error_for_status()
        .map_err(|err| format!("Remote image request failed: {err}"))?;

    if response
        .content_length()
        .is_some_and(|size| size > MAX_IMAGE_BYTES)
    {
        return Err("Remote image exceeds the 25 MB export limit".to_string());
    }

    let media_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .map(str::trim)
        .filter(|value| value.starts_with("image/"))
        .ok_or_else(|| "Remote URL did not return an image".to_string())?
        .to_string();
    let bytes = response
        .bytes()
        .await
        .map_err(|err| format!("Failed to read remote image: {err}"))?;
    if bytes.len() as u64 > MAX_IMAGE_BYTES {
        return Err("Remote image exceeds the 25 MB export limit".to_string());
    }

    let encoded = general_purpose::STANDARD.encode(&bytes);
    let remote_file_name = parsed_url
        .path_segments()
        .and_then(|mut segments| segments.next_back())
        .filter(|name| !name.is_empty())
        .unwrap_or("remote-image")
        .to_string();

    Ok(LocalImage {
        path: parsed_url.to_string(),
        file_name: remote_file_name,
        media_type: media_type.clone(),
        data_url: format!("data:{media_type};base64,{encoded}"),
    })
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

struct FontFormat {
    extension: &'static str,
    css_format: &'static str,
    media_type: &'static str,
}

fn detect_font_format(bytes: &[u8]) -> Option<FontFormat> {
    let signature = bytes.get(0..4)?;
    match signature {
        [0x77, 0x4f, 0x46, 0x32] => Some(FontFormat {
            extension: "woff2",
            css_format: "woff2",
            media_type: "font/woff2",
        }),
        [0x77, 0x4f, 0x46, 0x46] => Some(FontFormat {
            extension: "woff",
            css_format: "woff",
            media_type: "font/woff",
        }),
        [0x4f, 0x54, 0x54, 0x4f] => Some(FontFormat {
            extension: "otf",
            css_format: "opentype",
            media_type: "font/otf",
        }),
        [0x00, 0x01, 0x00, 0x00] | [0x74, 0x72, 0x75, 0x65] => Some(FontFormat {
            extension: "ttf",
            css_format: "truetype",
            media_type: "font/ttf",
        }),
        _ => None,
    }
}

fn custom_fonts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path| path.join("custom-fonts"))
        .map_err(|err| format!("Application data directory is not available: {err}"))
}

fn next_custom_font_id(fonts_dir: &Path, created_at: u64) -> String {
    for suffix in 0..1000_u16 {
        let id = if suffix == 0 {
            format!("font_{created_at:x}")
        } else {
            format!("font_{created_at:x}_{suffix}")
        };
        if !fonts_dir.join(format!("{id}.json")).exists() {
            return id;
        }
    }
    format!("font_{created_at:x}_{}", std::process::id())
}

fn validate_custom_font_id(font_id: &str) -> Result<(), String> {
    if font_id.is_empty()
        || font_id.len() > 80
        || !font_id.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '_' || character == '-'
        })
    {
        return Err("Invalid custom font identifier".to_string());
    }
    Ok(())
}

fn read_custom_font_metadata(fonts_dir: &Path, font_id: &str) -> Result<CustomFont, String> {
    let metadata_path = fonts_dir.join(format!("{font_id}.json"));
    let bytes = fs::read(&metadata_path).map_err(|err| {
        format!(
            "Failed to read custom font metadata {}: {err}",
            metadata_path.display()
        )
    })?;
    let font = serde_json::from_slice::<CustomFont>(&bytes)
        .map_err(|err| format!("Invalid custom font metadata: {err}"))?;
    if font.id != font_id {
        return Err("Custom font metadata identifier does not match".to_string());
    }
    Ok(font)
}

fn find_duplicate_custom_font(
    fonts_dir: &Path,
    candidate_bytes: &[u8],
) -> Result<Option<CustomFont>, String> {
    let entries = fs::read_dir(fonts_dir).map_err(|err| {
        format!(
            "Failed to read custom font directory {}: {err}",
            fonts_dir.display()
        )
    })?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }
        let Ok(metadata_bytes) = fs::read(&path) else {
            continue;
        };
        let Ok(font) = serde_json::from_slice::<CustomFont>(&metadata_bytes) else {
            continue;
        };
        if font.size != candidate_bytes.len() as u64 || validate_custom_font_id(&font.id).is_err() {
            continue;
        }
        let stored_path = stored_custom_font_path(fonts_dir, &font);
        let Ok(stored_bytes) = fs::read(stored_path) else {
            continue;
        };
        if stored_bytes == candidate_bytes {
            return Ok(Some(font));
        }
    }
    Ok(None)
}

fn stored_custom_font_path(fonts_dir: &Path, font: &CustomFont) -> PathBuf {
    let extension = match font.format.as_str() {
        "woff2" => "woff2",
        "woff" => "woff",
        "opentype" => "otf",
        _ => "ttf",
    };
    fonts_dir.join(format!("{}.{}", font.id, extension))
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
