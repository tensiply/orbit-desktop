/// Domain policy for determining whether an environment variable value should
/// be redacted when displayed. Centralizes the rule so no handler duplicates it.
pub struct SecretPolicy;

impl SecretPolicy {
    pub fn is_sensitive(key: &str) -> bool {
        let k = key.to_uppercase();
        k.contains("TOKEN")
            || k.contains("SECRET")
            || k.contains("PASSWORD")
            || k.contains("_KEY")
            || k.contains("AUTH")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sensitive_keys_are_detected() {
        assert!(SecretPolicy::is_sensitive("ANTHROPIC_API_KEY"));
        assert!(SecretPolicy::is_sensitive("GH_TOKEN"));
        assert!(SecretPolicy::is_sensitive("DB_PASSWORD"));
        assert!(SecretPolicy::is_sensitive("OPENAI_SECRET"));
        assert!(SecretPolicy::is_sensitive("OAUTH_AUTH_TOKEN"));
    }

    #[test]
    fn plain_keys_are_not_redacted() {
        assert!(!SecretPolicy::is_sensitive("HOME"));
        assert!(!SecretPolicy::is_sensitive("ORBIT_WORKSPACE"));
        assert!(!SecretPolicy::is_sensitive("PATH"));
    }
}
