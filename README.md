# Letterboxd Helper

Pesquise filmes, avalie (com meia estrela e review) e gere o CSV para importar em https://letterboxd.com/import/.

## Rodar localmente
1. Abra `config.js`.
2. Coloque sua chave do TMDB (API Key v3) em `config.js`.
3. Abra o `index.html` no navegador.

## Deploy no Render (Static Site)
- **Build Command:** `echo "window.TMDB_KEY=\"$TMDB_KEY\";" > config.js`
- **Publish Directory:** `.`
- Em **Environment**, crie a variável `TMDB_KEY` com a sua chave.

A chave sai do repositório, mas continua visível no navegador de quem acessa o site, porque o app roda inteiro no cliente.
