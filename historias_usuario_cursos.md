# Épico: Desenvolvimento da Plataforma de Cursos Online

Este documento detalha as Histórias de Usuário necessárias para o desenvolvimento da plataforma de cursos online, considerando regras de negócio, níveis de acesso (roles) e a estrutura arquitetural solicitada.

---

## 1. História de Usuário: Autenticação (Login e Cadastro)

**Descrição:**
> **Como** visitante da plataforma,
> **Eu quero** criar uma conta e fazer login no sistema,
> **Para que** eu possa acessar a plataforma e ter meu acesso controlado de acordo com meu perfil (aluno, editor ou admin).

**Critérios de Aceitação (Definition of Done):**
- [ ] **Validação de Cadastro de Usuários:** O formulário deve exigir nome (mínimo de 3 caracteres), email único válido e senha (mínimo de 6 caracteres).
- [ ] **Atribuição de Dados:** O sistema deve definir o `role` do usuário (aluno, editor ou admin) e registrar o status padrão como `ativo: true`.
- [ ] **Simulação de Login:** O sistema deve permitir a seleção/autenticação simulada de um usuário, guardando o seu `role` ativo na sessão do frontend.
- [ ] **Estrutura de Pastas (Técnico):**
  - As telas de login e cadastro devem estar em pastas separadas.
  - Cada pasta deve conter seus respectivos arquivos `index.html`, `style.css` e `script.js` separados.

---

## 2. História de Usuário: Navegação Global e Perfil

**Descrição:**
> **Como** usuário logado (independentemente do perfil),
> **Eu quero** visualizar um cabeçalho fixo e acessar meu perfil,
> **Para que** eu possa navegar facilmente pelas páginas e atualizar minhas informações pessoais.

**Critérios de Aceitação (Definition of Done):**
- [ ] **Header Fixo:** Implementar um cabeçalho fixo visível em todas as telas, contendo uma *navigation bar*.
- [ ] **Acesso ao Perfil:** A *navigation bar* deve conter um link direcionando para a página "Meu perfil".
- [ ] **Edição de Perfil:** Na tela de perfil, o usuário logado pode editar apenas os próprios dados, como nome e senha, sendo bloqueada a alteração do próprio `role`.
- [ ] **Estrutura de Pastas (Técnico):** O estilo do header fixo e de outros elementos globais deve ser gerenciado por um arquivo CSS global (ex: `global.css`).

---

## 3. História de Usuário: Catálogo e Consumo Dinâmico de Cursos

**Descrição:**
> **Como** aluno da plataforma,
> **Eu quero** acessar um catálogo e visualizar os detalhes de um curso específico,
> **Para que** eu possa explorar opções, me matricular e assistir às aulas.

**Critérios de Aceitação (Definition of Done):**
- [ ] **Catálogo de Cursos:** A tela de catálogo deve ser visível a todos os perfis e incluir um filtro por categoria.
- [ ] **Matrícula:** O aluno só pode se matricular em cursos que estejam com o status `"publicado"`.
- [ ] **Página do Curso:** A página deve listar as aulas disponíveis, exibir o progresso do aluno (se matriculado) e listar avaliações.
- [ ] **Renderização Dinâmica (Técnico):** A página de cursos deve utilizar o mesmo arquivo base (HTML) para exibir diferentes cursos de forma dinâmica via JavaScript, injetando os dados do `json-server`.
- [ ] **Estrutura de Pastas (Técnico):** A página de catálogo e a página dinâmica de cursos devem estar alocadas em pastas separadas na raiz do projeto frontend.

---

## 4. História de Usuário: Painéis de Gestão (Admin e Gestor)

**Descrição:**
> **Como** membro da equipe de administração,
> **Eu quero** acessar um painel administrativo com permissões baseadas no meu cargo,
> **Para que** eu possa gerenciar os conteúdos ou os usuários da plataforma de forma segura.

**Critérios de Aceitação (Definition of Done):**
- [ ] **Controle do Administrador (`admin`):**
  - Deve ter acesso total ao CRUD do sistema.
  - É o único perfil com permissão para gerenciar o endpoint `usuarios` (listar, criar, editar, excluir, ativar/desativar contas e alterar o `role` de qualquer pessoa).
- [ ] **Controle do Gestor de Conteúdo (`editor`):**
  - Deve ter acesso restrito ao CRUD relacionado apenas ao conteúdo educacional (criar, editar e excluir cursos, aulas e categorias).
  - Não pode acessar o gerenciamento de usuários.
- [ ] **Proteção de Rotas (Técnico):** Como o backend é simulado via `json-server`, o bloqueio de acesso aos painéis de CRUD não autorizados deve ser garantido pela camada do frontend, validando o `role` logado na sessão.
- [ ] **Estrutura de Pastas (Técnico):** O painel administrativo deve possuir sua própria pasta isolada, com arquivos HTML, CSS e JS dedicados à gestão.
