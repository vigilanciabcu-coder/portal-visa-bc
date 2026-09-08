# 🏛️ Portal da Vigilância Sanitária - Balneário Camboriú (DVIS)

Sistema de Gestão de Fiscalizações, Vistorias Sanitárias, Cadastro de Feirantes, Agenda de Vistorias e Registro de Ocorrências da Diretoria de Vigilância Sanitária de Balneário Camboriú.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React (Ícones)
- **Backend**: Express (Node.js full-stack com servidor SSR/API)
- **Build & Dev Tools**: Vite, ESBuild, TSX
- **Animações**: Motion (Framer Motion)

---

## 📂 Estrutura do Projeto

```text
.
├── src/
│   ├── components/       # Componentes React da aplicação
│   │   ├── Header.tsx    # Cabeçalho oficial com Brasão e DVIS BC
│   │   ├── Sidebar.tsx   # Menu de navegação lateral
│   │   ├── HomeView.tsx  # Dashboard principal
│   │   ├── FeirasView.tsx # Gestão e Cadastro de Feirantes
│   │   ├── Footer.tsx    # Rodapé institucional
│   │   └── ...
│   ├── data/             # Dados mockados e utilitários
│   ├── types.ts          # Definições de tipos TypeScript
│   ├── App.tsx           # Componente raiz com roteamento e modais
│   └── main.tsx          # Ponto de entrada React
├── server.ts             # Servidor backend Express + Vite Middleware
├── metadata.json         # Configurações do applet no Google AI Studio
├── package.json          # Dependências e scripts do projeto
└── README.md             # Documentação do repositório
```

---

## 💻 Como Executar Localmente

### Pré-requisitos
- **Node.js**: v18+ ou superior
- **npm**: v9+ ou superior

### Passos:
1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
   cd NOME-DO-REPOSITORIO
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Iniciar o ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000`.

4. **Gerar a build de produção:**
   ```bash
   npm run build
   ```

5. **Testar a execução de produção:**
   ```bash
   npm start
   ```

---

## 📤 Tutorial de Exportação e Envio para o GitHub

Existem duas formas fáceis de enviar este projeto para o seu GitHub:

---

### 🟢 Método 1: Exportar Direto pelo Google AI Studio (Recomendado)

1. No canto superior direito da tela do **Google AI Studio**, clique no botão de **Configurações / Opções** (ou no ícone de engrenagem / menu de exportação).
2. Selecione a opção **Export to GitHub** (Exportar para o GitHub).
3. Conecte sua conta do GitHub caso ainda não esteja conectada.
4. Escolha um nome para o seu repositório (ex: `vigilancia-sanitaria-bc`).
5. Defina se o repositório será **Público** ou **Privado**.
6. Clique em **Export** / **Create Repository**.
7. Pronto! O Google AI Studio irá criar o repositório e enviar todos os arquivos automaticamente.

---

### 🔵 Método 2: Envio Manual via Terminal / Git (ZIP ou Git Local)

Caso você tenha baixado o projeto como arquivo **.ZIP** ou deseje enviar via linha de comando:

#### Passo 1: Criar o Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Insira o nome do repositório (ex: `vigilancia-sanitaria-bc`).
3. Deixe desmarcada a opção de "Add a README file" (pois este repositório já possui um).
4. Clique em **Create repository**.

#### Passo 2: Executar os Comandos no Terminal (na pasta do projeto)

```bash
# 1. Inicializar o repositório Git
git init

# 2. Adicionar todos os arquivos ao controle de versão
git add .

# 3. Fazer o primeiro commit
git commit -m "feat: versão inicial do Portal Vigilância Sanitária BC"

# 4. Renomear a branch principal para main
git branch -M main

# 5. Conectar o repositório local ao GitHub (substitua pelo seu link)
git remote add origin https://github.com/SEU-USUARIO/vigilancia-sanitaria-bc.git

# 6. Enviar o código para o GitHub
git push -u origin main
```

---

## 🔺 Tutorial de Deploy no Vercel (Do GitHub para o Vercel)

Após enviar o seu projeto para o GitHub, colocá-lo no ar pelo **Vercel** é extremamente rápido e gratuito:

### Passo 1: Acessar ou Criar conta no Vercel
1. Acesse [vercel.com](https://vercel.com).
2. Faça login usando sua conta do **GitHub** (clique em *Continue with GitHub*).

### Passo 2: Importar o Repositório
1. No painel (Dashboard) do Vercel, clique no botão **"Add New..."** e selecione **"Project"**.
2. Na lista de repositórios do seu GitHub, localize o repositório do projeto (ex: `vigilancia-sanitaria-bc`).
3. Clique em **"Import"**.

### Passo 3: Configurar o Projeto (Detectado Automaticamente)
1. O Vercel reconhecerá automaticamente que se trata de um projeto **Vite**.
2. As configurações padrão são:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Não precisa alterar nenhuma dessas configurações!
4. Clique no botão azul **"Deploy"**.

### Passo 4: Prontinho! 🎉
- O Vercel irá compilar a aplicação e em menos de 1 minuto vai gerar o link público da sua aplicação (ex: `vigilancia-sanitaria-bc.vercel.app`).
- **Atualização Automática**: Toda vez que você enviar novos commits para o GitHub (`git push`), o Vercel irá atualizar o site automaticamente online!

---

## 🏛️ Créditos e Instituição
**Prefeitura Municipal de Balneário Camboriú**  
*Secretaria de Saúde - Diretoria de Vigilância Sanitária (DVIS)*  
Desenvolvido no Google AI Studio.
