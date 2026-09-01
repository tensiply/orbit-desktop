use std::path::PathBuf;

fn parse_targets(content: &str) -> Vec<String> {
    content
        .lines()
        .filter_map(|line| {
            if line.starts_with('#')
                || line.starts_with('\t')
                || line.starts_with(' ')
                || line.is_empty()
            {
                return None;
            }
            let colon = line.find(':')?;
            let target = line[..colon].trim();
            if target.is_empty()
                || target.starts_with('.')
                || target.contains('$')
                || target.contains('=')
                || target.contains(' ')
            {
                return None;
            }
            Some(target.to_string())
        })
        .collect()
}

#[tauri::command]
pub async fn makefile_targets(path: String) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(&path);
    let names = ["Makefile", "makefile", "GNUmakefile"];

    let content = names.iter().find_map(|name| {
        let p = dir.join(name);
        p.is_file()
            .then(|| std::fs::read_to_string(&p).ok())
            .flatten()
    });

    match content {
        Some(c) => Ok(parse_targets(&c)),
        None => Ok(vec![]),
    }
}
