// ==================================================== //
// LÓGICA DO PAINEL DE GESTÃO - ADMIN & EDITOR (RBAC)   //
// ==================================================== //

const API_URL = "http://localhost:3000";

// Elementos da Interface
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");

const tabCursosBtn = document.getElementById("tabCursosBtn");
const tabUsuariosBtn = document.getElementById("tabUsuariosBtn");
const tabCursos = document.getElementById("tabCursos");
const tabUsuarios = document.getElementById("tabUsuarios");

const tbodyCursos = document.getElementById("tbodyCursos");
const tbodyUsuarios = document.getElementById("tbodyUsuarios");

// Modais
const modalCurso = document.getElementById("modalCurso");
const formCurso = document.getElementById("formCurso");
const modalUsuario = document.getElementById("modalUsuario");
const formUsuario = document.getElementById("formUsuario");


// ---------------------------------------------------- //
// 1. PROTEÇÃO DE ROTAS E VALIDAÇÃO DE PERMISSÕES (RBAC)//
// ---------------------------------------------------- //
function validarAcessoPainel() {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");

    // 1. Se não tiver usuário logado -> redireciona para o login
    if (!usuarioSalvo) {
        alert("Sessão expirada. Faça login para continuar.");
        window.location.href = "../login/index.html";
        return null;
    }

    const usuario = JSON.parse(usuarioSalvo);

    // 2. Proteção de Rota Frontend: Aluno tenta acessar o Admin -> Bloqueia e Redireciona!
    if (usuario.role === "aluno") {
        alert("⚠️ Acesso Negado! Alunos não possuem permissão para acessar o Painel de Gestão.");
        window.location.href = "../catalogo/index.html";
        return null;
    }

    // Configura o Header
    if (userWelcome) userWelcome.textContent = `Olá, ${usuario.nome}`;
    if (userRoleBadge) {
        userRoleBadge.textContent = usuario.role.toUpperCase();
        userRoleBadge.className = `badge-role ${usuario.role}`;
    }

    // 3. Controle de Exibição por Role:
    // - Editor: vê apenas Cursos. A aba de Usuários é OCULTADA e BLOQUEADA.
    // - Admin: tem acesso a ambas as abas (Cursos e Usuários).
    if (usuario.role === "editor") {
        tabUsuariosBtn.classList.add("hidden");
        tabUsuarios.classList.add("hidden");
    } else if (usuario.role === "admin") {
        tabUsuariosBtn.classList.remove("hidden");
    }

    return usuario;
}

if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("usuarioLogado");
        window.location.href = "../login/index.html";
    });
}

// ---------------------------------------------------- //
// 2. COMPORTAMENTO DAS ABAS                            //
// ---------------------------------------------------- //
tabCursosBtn.addEventListener("click", () => {
    tabCursosBtn.classList.add("active");
    tabUsuariosBtn.classList.remove("active");
    tabCursos.classList.remove("hidden");
    tabUsuarios.classList.add("hidden");
});

tabUsuariosBtn.addEventListener("click", () => {
    tabUsuariosBtn.classList.add("active");
    tabCursosBtn.classList.remove("active");
    tabUsuarios.classList.remove("hidden");
    tabCursos.classList.add("hidden");
});

// ---------------------------------------------------- //
// 3. CRUD DE CURSOS (DISPONÍVEL PARA EDITOR E ADMIN)   //
// ---------------------------------------------------- //
async function carregarCursosAdmin() {
    tbodyCursos.innerHTML = "<tr><td colspan='5'>Carregando cursos...</td></tr>";

    try {
        const [respCursos, respCats] = await Promise.all([
            fetch(`${API_URL}/cursos`),
            fetch(`${API_URL}/categorias`)
        ]);

        if (!respCursos.ok) return;

        const cursos = await respCursos.json();
        const categorias = respCats.ok ? await respCats.json() : [];

        // Preenche as opções do select de categorias no modal de cursos
        const selectCat = document.getElementById("cursoCategoria");
        selectCat.innerHTML = "";
        categorias.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.nome;
            selectCat.appendChild(opt);
        });

        tbodyCursos.innerHTML = "";

        if (cursos.length === 0) {
            tbodyCursos.innerHTML = "<tr><td colspan='5'>Nenhum curso cadastrado.</td></tr>";
            return;
        }

        cursos.forEach(curso => {
            const catObj = categorias.find(c => c.id === curso.categoriaId);
            const nomeCat = catObj ? catObj.nome : "Geral";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${curso.titulo}</strong></td>
                <td>${nomeCat}</td>
                <td>${curso.cargaHoraria || '10h'}</td>
                <td><span class="badge-status ${curso.status}">${curso.status.toUpperCase()}</span></td>
                <td class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editarCurso('${curso.id}')">✏️ Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="excluirCurso('${curso.id}', '${curso.titulo}')">🗑️ Excluir</button>
                </td>
            `;
            tbodyCursos.appendChild(tr);
        });

    } catch (e) {
        tbodyCursos.innerHTML = "<tr><td colspan='5'>Erro ao carregar cursos da API.</td></tr>";
    }
}

// Abrir e Fechar Modal de Cursos
document.getElementById("btnAbrirModalNovoCurso").addEventListener("click", () => {
    document.getElementById("cursoId").value = "";
    document.getElementById("modalCursoTitle").textContent = "Criar Novo Curso";
    formCurso.reset();
    modalCurso.classList.remove("hidden");
});

document.getElementById("btnFecharModalCurso").addEventListener("click", () => modalCurso.classList.add("hidden"));
document.getElementById("btnCancelarModalCurso").addEventListener("click", () => modalCurso.classList.add("hidden"));

// Salvar / Criar / Editar Curso
formCurso.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("cursoId").value;
    const titulo = document.getElementById("cursoTitulo").value.trim();
    const descricao = document.getElementById("cursoDescricao").value.trim();
    const categoriaId = document.getElementById("cursoCategoria").value;
    const cargaHoraria = document.getElementById("cursoCarga").value.trim();
    const instrutor = document.getElementById("cursoInstrutor").value.trim();
    const status = document.getElementById("cursoStatus").value;

    const dadosCurso = {
        titulo,
        descricao,
        categoriaId,
        cargaHoraria,
        instrutor,
        status,
        imagem: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"
    };

    try {
        if (id) {
            // Edição (PATCH)
            await fetch(`${API_URL}/cursos/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCurso)
            });
            alert("Curso atualizado com sucesso!");
        } else {
            // Criação (POST)
            dadosCurso.id = "curso_" + Date.now();
            dadosCurso.criadoEm = new Date().toISOString();

            await fetch(`${API_URL}/cursos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCurso)
            });
            alert("Novo curso criado com sucesso!");
        }

        modalCurso.classList.add("hidden");
        carregarCursosAdmin();

    } catch (e) {
        alert("Erro ao salvar curso.");
    }
});

async function editarCurso(id) {
    try {
        const resp = await fetch(`${API_URL}/cursos/${id}`);
        if (!resp.ok) return;

        const curso = await resp.json();
        document.getElementById("cursoId").value = curso.id;
        document.getElementById("cursoTitulo").value = curso.titulo;
        document.getElementById("cursoDescricao").value = curso.descricao;
        document.getElementById("cursoCategoria").value = curso.categoriaId;
        document.getElementById("cursoCarga").value = curso.cargaHoraria;
        document.getElementById("cursoInstrutor").value = curso.instrutor;
        document.getElementById("cursoStatus").value = curso.status;

        document.getElementById("modalCursoTitle").textContent = "Editar Curso";
        modalCurso.classList.remove("hidden");
    } catch (e) {
        alert("Erro ao carregar curso para edição.");
    }
}

async function excluirCurso(id, titulo) {
    if (!confirm(`Tem certeza que deseja excluir o curso "${titulo}"?`)) return;

    try {
        await fetch(`${API_URL}/cursos/${id}`, { method: "DELETE" });
        carregarCursosAdmin();
    } catch (e) {
        alert("Erro ao excluir curso.");
    }
}


// ---------------------------------------------------- //
// 4. CRUD DE USUÁRIOS (EXCLUSIVO PARA PERFIL ADMIN)    //
// ---------------------------------------------------- //
async function carregarUsuariosAdmin() {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    
    // Dupla validação de segurança no frontend: se não for admin, não executa a chamada
    if (!usuarioLogado || usuarioLogado.role !== "admin") return;

    tbodyUsuarios.innerHTML = "<tr><td colspan='5'>Carregando usuários...</td></tr>";

    try {
        const resp = await fetch(`${API_URL}/usuarios`);
        if (!resp.ok) return;

        const usuarios = await resp.json();
        tbodyUsuarios.innerHTML = "";

        usuarios.forEach(u => {
            const tr = document.createElement("tr");
            const estaAtivo = u.ativo !== false;

            tr.innerHTML = `
                <td><strong>${u.nome}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge-role ${u.role}">${u.role.toUpperCase()}</span></td>
                <td>
                    <span class="badge-status ${estaAtivo ? 'publicado' : 'rascunho'}">
                        ${estaAtivo ? 'ATIVO' : 'DESATIVADO'}
                    </span>
                </td>
                <td class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editarUsuarioAdmin('${u.id}')">✏️ Editar / Role</button>
                    <button class="btn ${estaAtivo ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="alternarStatusUsuario('${u.id}', ${estaAtivo})">
                        ${estaAtivo ? '🚫 Desativar' : '✅ Ativar'}
                    </button>
                </td>
            `;
            tbodyUsuarios.appendChild(tr);
        });

    } catch (e) {
        tbodyUsuarios.innerHTML = "<tr><td colspan='5'>Erro ao carregar usuários da API.</td></tr>";
    }
}

// Modal Usuários
document.getElementById("btnFecharModalUsuario").addEventListener("click", () => modalUsuario.classList.add("hidden"));
document.getElementById("btnCancelarModalUsuario").addEventListener("click", () => modalUsuario.classList.add("hidden"));

const btnAbrirModalNovoUsuario = document.getElementById("btnAbrirModalNovoUsuario");
if (btnAbrirModalNovoUsuario) {
    btnAbrirModalNovoUsuario.addEventListener("click", () => {
        document.getElementById("usuarioId").value = "";
        document.getElementById("modalUsuarioTitle").textContent = "Criar Novo Usuário";
        formUsuario.reset();
        modalUsuario.classList.remove("hidden");
    });
}

// Editar Usuário (Admin pode alterar qualquer dado, incluindo Role e Ativo)
async function editarUsuarioAdmin(id) {
    try {
        const resp = await fetch(`${API_URL}/usuarios/${id}`);
        if (!resp.ok) return;

        const u = await resp.json();
        document.getElementById("usuarioId").value = u.id;
        document.getElementById("usuarioNome").value = u.nome;
        document.getElementById("usuarioEmail").value = u.email;
        document.getElementById("usuarioSenha").value = u.senha || "";
        document.getElementById("usuarioRole").value = u.role;
        document.getElementById("usuarioAtivo").value = String(u.ativo !== false);

        document.getElementById("modalUsuarioTitle").textContent = `Editar Usuário: ${u.nome}`;
        modalUsuario.classList.remove("hidden");
    } catch (e) {
        alert("Erro ao carregar usuário.");
    }
}

// Salvar Alterações do Usuário (Admin)
formUsuario.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("usuarioId").value;
    const nome = document.getElementById("usuarioNome").value.trim();
    const email = document.getElementById("usuarioEmail").value.trim().toLowerCase();
    const senha = document.getElementById("usuarioSenha").value.trim();
    const role = document.getElementById("usuarioRole").value;
    const ativo = document.getElementById("usuarioAtivo").value === "true";

    const dadosUser = { nome, email, senha, role, ativo };

    try {
        if (id) {
            await fetch(`${API_URL}/usuarios/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosUser)
            });
            alert("Usuário atualizado com sucesso!");
        } else {
            dadosUser.id = "u_" + Date.now();
            dadosUser.criadoEm = new Date().toISOString();

            await fetch(`${API_URL}/usuarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosUser)
            });
            alert("Usuário criado com sucesso!");
        }

        modalUsuario.classList.add("hidden");
        carregarUsuariosAdmin();

    } catch (e) {
        alert("Erro ao salvar usuário.");
    }
});

// Alternar status do usuário (Ativar / Desativar)
async function alternarStatusUsuario(id, statusAtual) {
    try {
        await fetch(`${API_URL}/usuarios/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ativo: !statusAtual })
        });
        carregarUsuariosAdmin();
    } catch (e) {
        alert("Erro ao alterar status do usuário.");
    }
}


// ---------------------------------------------------- //
// 5. INICIALIZAÇÃO DO PAINEL                          //
// ---------------------------------------------------- //
document.addEventListener("DOMContentLoaded", () => {
    const usuario = validarAcessoPainel();
    if (usuario) {
        carregarCursosAdmin();
        if (usuario.role === "admin") {
            carregarUsuariosAdmin();
        }
    }
});
