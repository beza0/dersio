-- Giriş gerektirmeyen veli bağlantısı: bağlantıyı açan kişi e-postasız/parolasız misafir veli hesabıyla oturum alır.
ALTER TABLE app_user ADD COLUMN is_guest boolean NOT NULL DEFAULT false;
ALTER TABLE guardian_link ADD COLUMN access_token_hash text;
CREATE UNIQUE INDEX guardian_link_access_token_hash_key ON guardian_link (access_token_hash) WHERE access_token_hash IS NOT NULL;
