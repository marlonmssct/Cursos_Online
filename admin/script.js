// ==================================================== //
// LÓGICA DO PAINEL DE GESTÃO - ADMIN & EDITOR (RBAC)   //
// Backend simulado via json-server: cursos, categorias //
// e usuários trafegam sempre via fetch nos endpoints.  //
// O localStorage guarda apenas a sessão do usuário      //
// logado. Itens sem permissão de acesso nunca são        //
// criados no DOM (RBAC por omissão, não CSS).            //
// ==================================================== //

function escapeHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function toastSucesso(mensagem) {
    Swal.fire({
        toast: true, position: "top-end", icon: "success", title: mensagem,
        showConfirmButton: false, timer: 2200, timerProgressBar: true
    });
}

function toastErro(mensagem) {
    Swal.fire({
        toast: true, position: "top-end", icon: "error", title: mensagem,
        showConfirmButton: false, timer: 2600, timerProgressBar: true
    });
}

async function confirmarAcao({ titulo, texto, confirmText = "Confirmar", icon = "warning" }) {
    const resultado = await Swal.fire({
        title: titulo,
        text: texto,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#EF4444",
        cancelButtonColor: "#6E6A78",
        reverseButtons: true
    });
    return resultado.isConfirmed;
}

// ---------------------------------------------------- //
// 1. AUTENTICAÇÃO E RBAC                                //
// ---------------------------------------------------- //
async function checkAuth() {
    const usuario = Sessao.getUsuario();

    if (!usuario || !usuario.role) {
        await Swal.fire({ icon: "info", title: "Sessão necessária", text: "Faça login para continuar.", confirmButtonColor: "#3A4171" });
        window.location.href = "../login/index.html";
        return null;
    }

    if (usuario.role === "aluno") {
        await Swal.fire({ icon: "warning", title: "Acesso negado", text: "Alunos não possuem permissão para acessar o Painel de Gestão.", confirmButtonColor: "#3A4171" });
        window.location.href = "../catalogo/index.html";
        return null;
    }

    return usuario;
}

function renderHeader(usuario) {
    document.getElementById("userWelcome").textContent = `Olá, ${usuario.nome}`;
    const badge = document.getElementById("userRoleBadge");
    badge.textContent = usuario.role.toUpperCase();
    badge.className = `badge-role ${usuario.role}`;
}

document.getElementById("btnLogout").addEventListener("click", () => {
    Sessao.logout();
    window.location.href = "../login/index.html";
});

// ---------------------------------------------------- //
// 2. MONTAGEM DO PAINEL CONFORME O CARGO                //
// ---------------------------------------------------- //
function renderAdminRoot(usuario) {
    const root = document.getElementById("adminRoot");

    document.getElementById("adminSubtitle").textContent = usuario.role === "admin"
        ? "Gerencie cursos, categorias e o acesso de toda a equipe."
        : "Gerencie o conteúdo educacional da plataforma.";

    if (usuario.role === "admin") {
        root.innerHTML = `
            <div class="admin-tabs" id="adminTabs">
                <button class="tab-btn active" data-tab="cursos" type="button">Cursos &amp; Conteúdo</button>
                <button class="tab-btn" data-tab="usuarios" type="button">Usuários &amp; Permissões</button>
            </div>
            <div class="tab-panel" id="painelCursos"></div>
            <div class="tab-panel hidden" id="painelUsuarios"></div>
        `;

        root.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.addEventListener("click", () => alternarAba(btn.dataset.tab));
        });

        renderUsuariosPanel(usuario);
    } else {
        // Cargo "editor": a aba e o painel de usuários nunca são criados no DOM.
        root.innerHTML = `<div class="tab-panel" id="painelCursos"></div>`;
    }

    renderCursosPanel();
}

function alternarAba(aba) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === aba));
    document.getElementById("painelCursos").classList.toggle("hidden", aba !== "cursos");
    document.getElementById("painelUsuarios").classList.toggle("hidden", aba !== "usuarios");
}

// ---------------------------------------------------- //
// 3. CRUD DE CURSOS (EDITOR E ADMIN)                    //
// ---------------------------------------------------- //
async function renderCursosPanel() {
    const painel = document.getElementById("painelCursos");
    painel.innerHTML = `
        <div class="block-header">
            <h3>Gerenciar Cursos</h3>
            <div class="block-header-actions">
                <button class="btn btn-outline btn-sm" id="btnNovaCategoria" type="button">Nova Categoria</button>
                <button class="btn btn-primary btn-sm" id="btnNovoCurso" type="button" disabled>Criar Novo Curso</button>
            </div>
        </div>
        <div class="cards-grid" id="gridCursos"><p class="empty-state">Carregando cursos...</p></div>
    `;

    document.getElementById("btnNovaCategoria").addEventListener("click", () => abrirModalCategoria());

    const grid = document.getElementById("gridCursos");
    const btnNovoCurso = document.getElementById("btnNovoCurso");

    try {
        const [respCursos, respCategorias] = await Promise.all([
            fetch(`${API_URL}/cursos`),
            fetch(`${API_URL}/categorias`)
        ]);

        if (!respCursos.ok) throw new Error("Falha ao carregar cursos");

        const cursos = await respCursos.json();
        const categorias = respCategorias.ok ? await respCategorias.json() : [];

        btnNovoCurso.disabled = false;
        btnNovoCurso.addEventListener("click", () => abrirModalCurso(null, categorias));

        if (cursos.length === 0) {
            grid.innerHTML = `<p class="empty-state">Nenhum curso cadastrado.</p>`;
            return;
        }

        grid.innerHTML = cursos.map((curso) => cardCurso(curso, categorias)).join("");

        grid.querySelectorAll("[data-action='editar-curso']").forEach((btn) => {
            btn.addEventListener("click", () => editarCurso(btn.dataset.id, categorias));
        });
        grid.querySelectorAll("[data-action='excluir-curso']").forEach((btn) => {
            btn.addEventListener("click", () => excluirCurso(btn.dataset.id, btn.dataset.titulo));
        });

    } catch (erro) {
        grid.innerHTML = `<p class="empty-state">Erro ao carregar cursos da API. Verifique se o json-server está rodando em ${API_URL}.</p>`;
    }
}

function formatarPreco(preco) {
    const numero = Number(preco);
    if (!numero) return "Gratuito";
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cardCurso(curso, categorias) {
    const categoria = categorias.find((c) => c.id === curso.categoriaId);
    const nomeCategoria = categoria ? categoria.nome : "Geral";

    return `
        <article class="course-card">
            <div class="course-card-media" style="background-image:url('${escapeHTML(curso.imagem || "")}')"></div>
            <div class="course-card-body">
                <div class="course-card-top">
                    <span class="badge-status ${curso.status}">${curso.status.toUpperCase()}</span>
                    <span class="course-card-cat">${escapeHTML(nomeCategoria)}</span>
                </div>
                <h4>${escapeHTML(curso.titulo)}</h4>
                <p class="course-card-desc">${escapeHTML(curso.descricao)}</p>
                <span class="course-card-price">${formatarPreco(curso.preco)}</span>
                <div class="course-card-meta">
                    <span>${escapeHTML(curso.instrutor)}</span>
                    <span>${escapeHTML(curso.cargaHoraria || "—")}</span>
                </div>
            </div>
            <div class="course-card-actions">
                <button class="btn btn-outline btn-sm" data-action="editar-curso" data-id="${curso.id}" type="button">Editar</button>
                <button class="btn btn-danger btn-sm" data-action="excluir-curso" data-id="${curso.id}" data-titulo="${escapeHTML(curso.titulo)}" type="button">Excluir</button>
            </div>
        </article>
    `;
}

async function editarCurso(id, categorias) {
    try {
        const resposta = await fetch(`${API_URL}/cursos/${id}`);
        if (!resposta.ok) throw new Error("Curso não encontrado");

        const curso = await resposta.json();
        abrirModalCurso(curso, categorias);
    } catch (erro) {
        toastErro("Erro ao carregar curso para edição.");
    }
}

function abrirModalCurso(curso, categorias) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3>${curso ? "Editar Curso" : "Criar Novo Curso"}</h3>
                <button type="button" class="btn-close" data-close>&times;</button>
            </div>
            <form id="formCurso">
                <div class="form-group">
                    <label for="cursoTitulo">Título do Curso</label>
                    <input type="text" id="cursoTitulo" placeholder="Ex: React.js Avançado" required value="${escapeHTML(curso?.titulo || "")}">
                </div>
                <div class="form-group">
                    <label for="cursoDescricao">Descrição do Curso</label>
                    <textarea id="cursoDescricao" rows="3" placeholder="Digite uma breve descrição..." required>${escapeHTML(curso?.descricao || "")}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="cursoCategoria">Categoria</label>
                        <select id="cursoCategoria" required>
                            ${categorias.map((c) => `<option value="${c.id}" ${curso?.categoriaId === c.id ? "selected" : ""}>${escapeHTML(c.nome)}</option>`).join("")}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="cursoCarga">Carga Horária</label>
                        <input type="text" id="cursoCarga" placeholder="Ex: 30h" required value="${escapeHTML(curso?.cargaHoraria || "")}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="cursoInstrutor">Instrutor Responsável</label>
                        <input type="text" id="cursoInstrutor" placeholder="Ex: Mariana Souza" required value="${escapeHTML(curso?.instrutor || "")}">
                    </div>
                    <div class="form-group">
                        <label for="cursoPreco">Preço (R$)</label>
                        <input type="number" id="cursoPreco" placeholder="Ex: 149.90" min="0" step="0.01" required value="${curso?.preco ?? 0}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="cursoStatus">Status de Publicação</label>
                    <select id="cursoStatus">
                        <option value="publicado" ${curso?.status === "publicado" ? "selected" : ""}>Publicado (Visível aos Alunos)</option>
                        <option value="rascunho" ${curso?.status === "rascunho" ? "selected" : ""}>Rascunho (Oculto aos Alunos)</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Curso</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => overlay.remove()));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#formCurso").addEventListener("submit", async (e) => {
        e.preventDefault();
        await salvarCurso(curso, overlay);
    });
}

async function salvarCurso(cursoExistente, overlay) {
    const dadosCurso = {
        titulo: overlay.querySelector("#cursoTitulo").value.trim(),
        descricao: overlay.querySelector("#cursoDescricao").value.trim(),
        categoriaId: overlay.querySelector("#cursoCategoria").value,
        cargaHoraria: overlay.querySelector("#cursoCarga").value.trim(),
        instrutor: overlay.querySelector("#cursoInstrutor").value.trim(),
        preco: parseFloat(overlay.querySelector("#cursoPreco").value) || 0,
        status: overlay.querySelector("#cursoStatus").value
    };

    try {
        if (cursoExistente) {
            await fetch(`${API_URL}/cursos/${cursoExistente.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCurso)
            });
            toastSucesso("Curso atualizado com sucesso!");
        } else {
            dadosCurso.id = "curso_" + Date.now();
            dadosCurso.criadoEm = new Date().toISOString();
            dadosCurso.imagem = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600";

            await fetch(`${API_URL}/cursos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCurso)
            });
            toastSucesso("Novo curso criado com sucesso!");
        }

        overlay.remove();
        renderCursosPanel();

    } catch (erro) {
        toastErro("Erro ao salvar curso na API.");
    }
}

function abrirModalCategoria() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card modal-card-sm">
            <div class="modal-header">
                <h3>Criar Nova Categoria</h3>
                <button type="button" class="btn-close" data-close>&times;</button>
            </div>
            <form id="formCategoria">
                <div class="form-group">
                    <label for="categoriaNome">Nome da Categoria</label>
                    <input type="text" id="categoriaNome" placeholder="Ex: Inteligência Artificial" required minlength="3">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Categoria</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => overlay.remove()));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#formCategoria").addEventListener("submit", async (e) => {
        e.preventDefault();
        await salvarCategoria(overlay);
    });
}

async function salvarCategoria(overlay) {
    const nome = overlay.querySelector("#categoriaNome").value.trim();
    const semAcentos = nome.normalize("NFD").split("").filter((ch) => {
        const codigo = ch.codePointAt(0);
        return codigo < 0x0300 || codigo > 0x036f;
    }).join("");
    const slug = semAcentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    try {
        await fetch(`${API_URL}/categorias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "cat_" + Date.now(), nome, slug })
        });
        toastSucesso("Categoria criada com sucesso!");
        overlay.remove();
        renderCursosPanel();
    } catch (erro) {
        toastErro("Erro ao criar categoria.");
    }
}

async function excluirCurso(id, titulo) {
    const confirmado = await confirmarAcao({
        titulo: "Excluir curso?",
        texto: `O curso "${titulo}" será removido permanentemente.`,
        confirmText: "Excluir"
    });
    if (!confirmado) return;

    try {
        await fetch(`${API_URL}/cursos/${id}`, { method: "DELETE" });
        toastSucesso("Curso excluído com sucesso.");
        renderCursosPanel();
    } catch (erro) {
        toastErro("Erro ao excluir curso.");
    }
}

// ---------------------------------------------------- //
// 4. CRUD DE USUÁRIOS (EXCLUSIVO PARA PERFIL ADMIN)     //
// ---------------------------------------------------- //
async function renderUsuariosPanel(usuarioAtual) {
    const painel = document.getElementById("painelUsuarios");
    if (!painel) return;

    painel.innerHTML = `
        <div class="block-header">
            <h3>Gerenciar Usuários e Roles</h3>
            <button class="btn btn-primary btn-sm" id="btnNovoUsuario" type="button">Criar Novo Usuário</button>
        </div>
        <div class="cards-grid" id="gridUsuarios"><p class="empty-state">Carregando usuários...</p></div>
    `;

    document.getElementById("btnNovoUsuario").addEventListener("click", () => abrirModalUsuario(null));

    const grid = document.getElementById("gridUsuarios");

    try {
        const resposta = await fetch(`${API_URL}/usuarios`);
        if (!resposta.ok) throw new Error("Falha ao carregar usuários");

        const usuarios = await resposta.json();
        grid.innerHTML = usuarios.map((u) => cardUsuario(u, usuarioAtual)).join("");

        grid.querySelectorAll("[data-action='editar-usuario']").forEach((btn) => {
            btn.addEventListener("click", () => editarUsuarioAdmin(btn.dataset.id));
        });
        grid.querySelectorAll("[data-action='toggle-usuario']").forEach((btn) => {
            btn.addEventListener("click", () => alternarStatusUsuario(btn.dataset.id, btn.dataset.ativo === "true"));
        });
        grid.querySelectorAll("[data-action='excluir-usuario']").forEach((btn) => {
            btn.addEventListener("click", () => excluirUsuario(btn.dataset.id, btn.dataset.nome));
        });

    } catch (erro) {
        grid.innerHTML = `<p class="empty-state">Erro ao carregar usuários da API. Verifique se o json-server está rodando em ${API_URL}.</p>`;
    }
}

function iniciais(nome) {
    return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function cardUsuario(u, usuarioAtual) {
    const ativo = u.ativo !== false;
    const ehVoceMesmo = u.id === usuarioAtual.id;

    // Um admin não pode desativar/excluir a própria conta (evita autobloqueio).
    const acoesSensiveis = ehVoceMesmo ? "" : `
        <button class="btn ${ativo ? "btn-danger" : "btn-secondary"} btn-sm" data-action="toggle-usuario" data-id="${u.id}" data-ativo="${ativo}" type="button">
            ${ativo ? "Desativar" : "Ativar"}
        </button>
        <button class="btn btn-danger btn-sm" data-action="excluir-usuario" data-id="${u.id}" data-nome="${escapeHTML(u.nome)}" type="button">Excluir</button>
    `;

    return `
        <article class="user-card">
            <div class="user-card-top">
                <div class="user-avatar">${escapeHTML(iniciais(u.nome))}</div>
                <div>
                    <h4>${escapeHTML(u.nome)}${ehVoceMesmo ? " (você)" : ""}</h4>
                    <span class="user-email">${escapeHTML(u.email)}</span>
                </div>
            </div>
            <div class="user-card-badges">
                <span class="badge-role ${u.role}">${u.role.toUpperCase()}</span>
                <span class="badge-status ${ativo ? "publicado" : "rascunho"}">${ativo ? "ATIVO" : "DESATIVADO"}</span>
            </div>
            <div class="user-card-actions">
                <button class="btn btn-outline btn-sm" data-action="editar-usuario" data-id="${u.id}" type="button">Editar / Role</button>
                ${acoesSensiveis}
            </div>
        </article>
    `;
}

async function editarUsuarioAdmin(id) {
    try {
        const resposta = await fetch(`${API_URL}/usuarios/${id}`);
        if (!resposta.ok) throw new Error("Usuário não encontrado");

        const usuario = await resposta.json();
        abrirModalUsuario(usuario);
    } catch (erro) {
        toastErro("Erro ao carregar usuário.");
    }
}

function abrirModalUsuario(usuario) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3>${usuario ? `Editar Usuário: ${escapeHTML(usuario.nome)}` : "Criar Novo Usuário"}</h3>
                <button type="button" class="btn-close" data-close>&times;</button>
            </div>
            <form id="formUsuario">
                <div class="form-group">
                    <label for="usuarioNome">Nome Completo</label>
                    <input type="text" id="usuarioNome" required minlength="3" value="${escapeHTML(usuario?.nome || "")}">
                </div>
                <div class="form-group">
                    <label for="usuarioEmail">E-mail</label>
                    <input type="email" id="usuarioEmail" required value="${escapeHTML(usuario?.email || "")}">
                </div>
                <div class="form-group">
                    <label for="usuarioSenha">Senha</label>
                    <input type="text" id="usuarioSenha" required minlength="6" value="${escapeHTML(usuario?.senha || "")}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="usuarioRole">Role / Perfil de Acesso</label>
                        <select id="usuarioRole">
                            <option value="aluno" ${usuario?.role === "aluno" ? "selected" : ""}>Aluno</option>
                            <option value="editor" ${usuario?.role === "editor" ? "selected" : ""}>Editor (Gestor de Conteúdo)</option>
                            <option value="admin" ${usuario?.role === "admin" ? "selected" : ""}>Administrador</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="usuarioAtivo">Status da Conta</label>
                        <select id="usuarioAtivo">
                            <option value="true" ${usuario?.ativo !== false ? "selected" : ""}>Ativo</option>
                            <option value="false" ${usuario?.ativo === false ? "selected" : ""}>Desativado (Bloqueado)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Usuário</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => overlay.remove()));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#formUsuario").addEventListener("submit", async (e) => {
        e.preventDefault();
        await salvarUsuario(usuario, overlay);
    });
}

async function salvarUsuario(usuarioExistente, overlay) {
    const email = overlay.querySelector("#usuarioEmail").value.trim().toLowerCase();

    const dadosUser = {
        nome: overlay.querySelector("#usuarioNome").value.trim(),
        email,
        senha: overlay.querySelector("#usuarioSenha").value.trim(),
        role: overlay.querySelector("#usuarioRole").value,
        ativo: overlay.querySelector("#usuarioAtivo").value === "true"
    };

    try {
        if (usuarioExistente) {
            const resposta = await fetch(`${API_URL}/usuarios/${usuarioExistente.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosUser)
            });

            // Se o admin estiver editando a própria conta, atualiza a sessão ativa também.
            const usuarioLogado = Sessao.getUsuario();
            if (resposta.ok && usuarioLogado.id === usuarioExistente.id) {
                Sessao.setUsuario(await resposta.json());
                renderHeader(Sessao.getUsuario());
            }

            toastSucesso("Usuário atualizado com sucesso!");
        } else {
            dadosUser.id = "u_" + Date.now();
            dadosUser.criadoEm = new Date().toISOString();

            await fetch(`${API_URL}/usuarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosUser)
            });
            toastSucesso("Usuário criado com sucesso!");
        }

        overlay.remove();
        renderUsuariosPanel(Sessao.getUsuario());

    } catch (erro) {
        toastErro("Erro ao salvar usuário.");
    }
}

async function alternarStatusUsuario(id, ativoAtual) {
    const confirmado = await confirmarAcao({
        titulo: ativoAtual ? "Desativar usuário?" : "Ativar usuário?",
        texto: ativoAtual ? "O usuário perderá o acesso à plataforma imediatamente." : "O usuário voltará a ter acesso à plataforma.",
        confirmText: ativoAtual ? "Desativar" : "Ativar",
        icon: ativoAtual ? "warning" : "question"
    });
    if (!confirmado) return;

    try {
        await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ativo: !ativoAtual })
        });
        toastSucesso(`Usuário ${ativoAtual ? "desativado" : "ativado"} com sucesso.`);
        renderUsuariosPanel(Sessao.getUsuario());
    } catch (erro) {
        toastErro("Erro ao alterar status do usuário.");
    }
}

async function excluirUsuario(id, nome) {
    const confirmado = await confirmarAcao({
        titulo: "Excluir usuário?",
        texto: `O usuário "${nome}" será removido permanentemente da plataforma.`,
        confirmText: "Excluir"
    });
    if (!confirmado) return;

    try {
        await fetch(`${API_URL}/usuarios/${id}`, { method: "DELETE" });
        toastSucesso("Usuário excluído com sucesso.");
        renderUsuariosPanel(Sessao.getUsuario());
    } catch (erro) {
        toastErro("Erro ao excluir usuário.");
    }
}

// ---------------------------------------------------- //
// 5. INICIALIZAÇÃO DO PAINEL                            //
// ---------------------------------------------------- //
document.addEventListener("DOMContentLoaded", async () => {
    const usuario = await checkAuth();
    if (!usuario) return;

    renderHeader(usuario);
    renderAdminRoot(usuario);
});
