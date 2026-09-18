# FSY 2027 — Gestão de Participantes

Aplicativo web para cadastrar e consultar até 500 participantes da conferência FSY, com dois perfis: **Liderança** (acesso total) e **Consultor** (consulta).

Identidade visual baseada no *2027 Youth Theme Visual Style Guide*: fundo Neutral 5 (`#EFEFE7`), azul `#007DA5`, ouro `#DBBF6B` e pergaminho `#F5EFCA`.

O app já está conectado ao projeto **FSY - POTO ALEGRE 2**. As tabelas `usuarios` e `participantes` já existem no Supabase.

## Como usar

1. Abra `http://127.0.0.1:8765/` (ou execute `serve.ps1`). Se aparecer a tela antiga de setup, use Ctrl+F5.
2. Entre com **suelencpalmeira@gmail.com**. Essa conta é a administradora.
3. Em **Usuários**, adicione os e-mails da liderança. Quem criar conta com um desses e-mails entra direto como liderança do evento.
4. Consultores continuam precisando de aprovação.

## Publicar no GitHub Pages (recomendado para o Gmail)

O GitHub não é um servidor como o `127.0.0.1`. Ele publica o site na internet, por exemplo:

`https://SEU-USUARIO.github.io/FSY-SUELEN/`

Assim o Gmail consegue voltar para o app sem precisar deixar uma janela aberta no PC.

### 1. Criar o repositório

1. Acesse [github.com/new](https://github.com/new) e entre na sua conta.
2. Nome do repositório: `FSY-SUELEN`.
3. Deixe **Public** (o Pages grátis só funciona em repositório público).
4. Não marque “Add a README”.
5. Clique em **Create repository**.

### 2. Enviar os arquivos (sem Git)

1. Na página do repositório vazio, clique em **uploading an existing file**.
2. Arraste tudo de `C:\FSY-SUELEN`, **exceto** `fsy-server.exe` e pastas vazias, se aparecerem.
3. Inclua pelo menos: `index.html`, `css`, `js`, `assets`, `.nojekyll`.
4. Clique em **Commit changes**.

### 3. Ligar o Pages

1. No repositório: **Settings → Pages**.
2. Em **Branch**, escolha `main` e a pasta `/ (root)`.
3. **Save**.
4. Espere 1 minuto e abra o endereço que aparecer, no formato `https://SEU-USUARIO.github.io/FSY-SUELEN/`.

### 4. Avisar o Google e o Supabase do novo endereço

Troque `SEU-USUARIO` pelo seu usuário do GitHub.

No [Google Cloud](https://console.cloud.google.com/auth/clients), em origens JavaScript autorizadas, adicione:

`https://SEU-USUARIO.github.io`

No [Supabase → URL Configuration](https://supabase.com/dashboard/project/pukresrhryarypzzmdch/auth/url-configuration):

- **Site URL:** `https://SEU-USUARIO.github.io/FSY-SUELEN/`
- **Additional Redirect URLs:** o mesmo endereço

O URI de redirecionamento do Google **não muda**. Continua:

`https://pukresrhryarypzzmdch.supabase.co/auth/v1/callback`

Depois abra o site do GitHub Pages e use **Entrar com Gmail**.

A administradora e os e-mails de liderança que ela cadastrar entram direto ao usar o Gmail. Consultores que entrarem com Gmail ficam pendentes até a aprovação.

## Uso no celular

A interface é mobile-first: botões grandes, navegação inferior e tabelas que viram cards. Observações médicas aparecem em fundo pergaminho, com ⚠️.

## Importação

Na lista de participantes, use **Importar planilha**.

O app lê a aba **Todas** da planilha Excel do formulário de inscrição (34 colunas). Consultor e Participante ficam na coluna **Tipo**, então não importe as outras abas para não duplicar.

Antes de gravar, aparece um preview com mapeamento de colunas, duplicados (mesmo e-mail ou CPF) e alertas linha a linha (e-mail ausente, CPF inválido, telefone fora do padrão). CPF, RG e dados de saúde não entram no preview nem em mensagens de erro.

Há também um CSV operacional antigo em `assets/modelo-participantes.csv` (Nome, Ala, Estaca, Contato Líder, Contato Responsável, Consultor, Companhia, Quarto, Observações).
