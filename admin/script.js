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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TOGGLE_SENHA_HTML = (targetId) => `
    <button type="button" class="toggle-senha" data-target="${targetId}" aria-label="Mostrar senha" tabindex="-1">
        <svg class="icon-olho" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        <svg class="icon-olho-fechado" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-3.09 3.88M6.53 6.53A13.4 13.4 0 0 0 1 11s4 7 11 7a10.94 10.94 0 0 0 4.47-.94"/></svg>
    </button>
`;

// O clique em ".toggle-senha" já é tratado globalmente por js/perfil-modal.js
// (carregado nesta página) — não duplicar o listener aqui, ou o campo de senha
// alterna de tipo duas vezes por clique e parece não fazer nada.

// Selo hexagonal da NEXA reaproveitado como ícone das telas de bloqueio de acesso
// (login necessário / acesso restrito) — os únicos dois momentos de marca do painel.
const NEXA_SWAL_BRAND_ICON = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 5 L88 26.5 C92 28.8 94 32.3 94 36.8 L94 63.2 C94 67.7 92 71.2 88 73.5 L50 95 C46 97.3 42 97.3 38 95 L12 73.5 C8 71.2 6 67.7 6 63.2 L6 36.8 C6 32.3 8 28.8 12 26.5 Z" fill="#2D1C52"/>
        <path d="M30 68 V34 C30 30 35 28 38 31 L64 64 C67 67 72 65 72 61 V30" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 43.5 L57 51 L42 58.5 Z" fill="#F3A730"/>
    </svg>
`;

function toastSucesso(mensagem) {
    Swal.fire({
        toast: true, position: "top-end", icon: "success", title: mensagem,
        showConfirmButton: false, timer: 2200, timerProgressBar: true,
        customClass: { popup: "nexa-toast" }
    });
}

function toastErro(mensagem) {
    Swal.fire({
        toast: true, position: "top-end", icon: "error", title: mensagem,
        showConfirmButton: false, timer: 2600, timerProgressBar: true,
        customClass: { popup: "nexa-toast" }
    });
}

async function confirmarAcao({ titulo, texto, confirmText = "Confirmar", icon = "warning", perigoso = true }) {
    const resultado = await Swal.fire({
        title: titulo,
        text: texto,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            popup: "nexa-swal",
            confirmButton: `btn ${perigoso ? "btn-danger" : "btn-secondary"}`,
            cancelButton: "btn btn-outline"
        }
    });
    return resultado.isConfirmed;
}

// ---------------------------------------------------- //
// 1. AUTENTICAÇÃO E RBAC                                //
// ---------------------------------------------------- //
async function checkAuth() {
    const usuario = Sessao.getUsuario();

    if (!usuario || !usuario.role) {
        await Swal.fire({
            iconHtml: NEXA_SWAL_BRAND_ICON,
            title: "Sessão necessária",
            text: "Faça login para acessar o Painel de Gestão.",
            confirmButtonText: "Ir para o login",
            buttonsStyling: false,
            customClass: { popup: "nexa-swal nexa-swal-gate", icon: "nexa-swal-brand-icon", confirmButton: "btn btn-primary" }
        });
        window.location.href = "../login/index.html";
        return null;
    }

    if (usuario.role === "aluno") {
        await Swal.fire({
            iconHtml: NEXA_SWAL_BRAND_ICON,
            title: "Acesso restrito",
            text: "Este painel é exclusivo para a equipe de gestão (Editor ou Administrador).",
            confirmButtonText: "Voltar ao catálogo",
            buttonsStyling: false,
            customClass: { popup: "nexa-swal nexa-swal-gate", icon: "nexa-swal-brand-icon", confirmButton: "btn btn-primary" }
        });
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

document.getElementById("btnLogout").addEventListener("click", async () => {
    // Confirmação antes de encerrar a sessão: o gestor pode estar no meio de uma edição.
    const confirmado = await confirmarAcao({
        titulo: "Sair do painel?",
        texto: "Alterações não salvas em modais abertos serão perdidas.",
        confirmText: "Sair",
        icon: "question",
        perigoso: false
    });
    if (!confirmado) return;

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
        const [respCurso, respAulas] = await Promise.all([
            fetch(`${API_URL}/cursos/${id}`),
            fetch(`${API_URL}/aulas?cursoId=${id}`)
        ]);

        if (!respCurso.ok) throw new Error("Curso não encontrado");

        const curso = await respCurso.json();
        const aulas = respAulas.ok ? await respAulas.json() : [];

        abrirModalCurso(curso, categorias, aulas);
    } catch (erro) {
        toastErro("Erro ao carregar curso para edição.");
    }
}

function abrirModalCurso(curso, categorias, aulasExistentes = []) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    // Prepara a lista inicial de aulas em memória
    let listaAulasMemoria = aulasExistentes.length > 0
        ? [...aulasExistentes].sort((a, b) => a.ordem - b.ordem)
        : [{ titulo: "Aula 1: Introdução", videoUrl: "https://www.youtube.com/watch?v=WRlfwBof66s", duracao: "15 min" }];

    let indiceAulaAtiva = 0;

    overlay.innerHTML = `
        <div class="modal-card" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
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

                <!-- GERENCIADOR DE VIDEOAULAS VIA SELECT (LIMPO E NÃO POLUÍDO) -->
                <div class="form-group" style="margin-top: 24px; border-top: 2px dashed var(--nexa-border); padding-top: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <div>
                            <label style="font-weight: 700; font-size: 1.05rem; color: var(--nexa-secondary);">🎬 Gerenciador de Videoaulas</label>
                            <small style="display: block; color: var(--nexa-text-muted);">Selecione a aula no menu abaixo para editar seus dados</small>
                        </div>
                        <button type="button" id="btnNovaVideoAulaSelect" class="btn btn-primary btn-sm">➕ Adicionar Videoaula</button>
                    </div>

                    <!-- SELECT DE SELEÇÃO DA AULA PARA EDIÇÃO -->
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label for="selectGerenciarAulas" style="font-weight: 600; font-size: 0.85rem;">Selecione a Aula para Configurar:</label>
                        <select id="selectGerenciarAulas" style="font-weight: 700; padding: 11px 14px; border-color: var(--nexa-primary); background-color: #F8FAFC; width: 100%;">
                            <!-- Populado dinamicamente -->
                        </select>
                    </div>

                    <!-- PAINEL DEDICADO DE EDIÇÃO DA AULA SELECIONADA NO SELECT -->
                    <div id="painelEdicaoAulaSelecionada" style="background: var(--nexa-bg-light); border: 1px solid var(--nexa-border); border-radius: var(--radius-sm); padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                            <strong id="labelAulaEditando" style="color: var(--nexa-primary); font-size: 0.95rem;">📖 Editando Aula 1</strong>
                            <button type="button" id="btnRemoverAulaSelecionada" class="btn btn-danger btn-sm" style="padding: 4px 10px; font-size: 0.8rem;">🗑️ Remover Aula</button>
                        </div>

                        <div class="form-group">
                            <label for="inputAulaTitulo">Título da Aula</label>
                            <input type="text" id="inputAulaTitulo" placeholder="Ex: Aula 1: Introdução aos conceitos" required>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label for="inputAulaUrl">URL do Vídeo (YouTube)</label>
                                <input type="url" id="inputAulaUrl" placeholder="https://www.youtube.com/watch?v=..." required>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label for="inputAulaDuracao">Duração</label>
                                <input type="text" id="inputAulaDuracao" placeholder="Ex: 15 min" value="15 min">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-actions" style="margin-top: 24px;">
                    <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Curso e Aulas</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    const selectGerenciar = overlay.querySelector("#selectGerenciarAulas");
    const btnNovoSelect = overlay.querySelector("#btnNovaVideoAulaSelect");
    const btnRemoverAula = overlay.querySelector("#btnRemoverAulaSelecionada");

    const labelAulaEditando = overlay.querySelector("#labelAulaEditando");
    const inputTitulo = overlay.querySelector("#inputAulaTitulo");
    const inputUrl = overlay.querySelector("#inputAulaUrl");
    const inputDuracao = overlay.querySelector("#inputAulaDuracao");

    // Função que atualiza o menu <select> e carrega os dados da aula ativa no painel
    function renderizarSelectEAulaAtiva(idxParaSelecionar = 0) {
        if (listaAulasMemoria.length === 0) {
            listaAulasMemoria.push({ titulo: "Aula 1: Introdução", videoUrl: "https://www.youtube.com/watch?v=WRlfwBof66s", duracao: "15 min" });
        }

        indiceAulaAtiva = Math.max(0, Math.min(idxParaSelecionar, listaAulasMemoria.length - 1));

        // Repopula as opções do select
        selectGerenciar.innerHTML = "";
        listaAulasMemoria.forEach((aula, index) => {
            const opt = document.createElement("option");
            opt.value = index;
            opt.textContent = `Aula ${index + 1}: ${aula.titulo || "(Sem título)"}`;
            if (index === indiceAulaAtiva) opt.selected = true;
            selectGerenciar.appendChild(opt);
        });

        // Carrega os dados da aula selecionada no formulário de edição
        const aulaAtual = listaAulasMemoria[indiceAulaAtiva];
        labelAulaEditando.textContent = `📖 Editando Aula ${indiceAulaAtiva + 1} de ${listaAulasMemoria.length}`;
        inputTitulo.value = aulaAtual.titulo || "";
        inputUrl.value = aulaAtual.videoUrl || "";
        inputDuracao.value = aulaAtual.duracao || "15 min";
    }

    // Evento ao trocar a opção no <select>
    selectGerenciar.addEventListener("change", (e) => {
        renderizarSelectEAulaAtiva(parseInt(e.target.value));
    });

    // Atualização em tempo real quando o usuário digita nos campos da aula ativa
    inputTitulo.addEventListener("input", (e) => {
        listaAulasMemoria[indiceAulaAtiva].titulo = e.target.value;
        selectGerenciar.options[indiceAulaAtiva].textContent = `Aula ${indiceAulaAtiva + 1}: ${e.target.value || "(Sem título)"}`;
    });

    inputUrl.addEventListener("input", (e) => {
        listaAulasMemoria[indiceAulaAtiva].videoUrl = e.target.value;
    });

    inputDuracao.addEventListener("input", (e) => {
        listaAulasMemoria[indiceAulaAtiva].duracao = e.target.value;
    });

    // Botão Adicionar Nova Videoaula: cria uma nova opção no select!
    btnNovoSelect.addEventListener("click", () => {
        const novaNum = listaAulasMemoria.length + 1;
        listaAulasMemoria.push({
            titulo: `Aula ${novaNum}: Conteúdo da Aula`,
            videoUrl: "https://www.youtube.com/watch?v=WRlfwBof66s",
            duracao: "15 min"
        });
        renderizarSelectEAulaAtiva(listaAulasMemoria.length - 1);
        toastSucesso(`Nova opção "Aula ${novaNum}" adicionada ao Select!`);
    });

    // Botão Remover Aula Ativa
    btnRemoverAula.addEventListener("click", () => {
        if (listaAulasMemoria.length <= 1) {
            toastErro("O curso deve conter pelo menos 1 videoaula.");
            return;
        }
        listaAulasMemoria.splice(indiceAulaAtiva, 1);
        renderizarSelectEAulaAtiva(Math.max(0, indiceAulaAtiva - 1));
        toastSucesso("Aula removida da lista.");
    });

    // Inicializa o select com a primeira aula
    renderizarSelectEAulaAtiva(0);

    overlay.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => overlay.remove()));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector("#formCurso").addEventListener("submit", async (e) => {
        e.preventDefault();
        await salvarCursoEAulasMemoria(curso, overlay, listaAulasMemoria);
    });
}

async function salvarCursoEAulasMemoria(cursoExistente, overlay, listaAulas) {
    const titulo = overlay.querySelector("#cursoTitulo").value.trim();
    const descricao = overlay.querySelector("#cursoDescricao").value.trim();
    const categoriaId = overlay.querySelector("#cursoCategoria").value;
    const cargaHoraria = overlay.querySelector("#cursoCarga").value.trim();
    const instrutor = overlay.querySelector("#cursoInstrutor").value.trim();
    const precoValor = overlay.querySelector("#cursoPreco").value.trim();

    if (!titulo) {
        toastErro("O título do curso é obrigatório.");
        return;
    }
    if (!descricao) {
        toastErro("A descrição do curso é obrigatória.");
        return;
    }
    if (!categoriaId) {
        toastErro("Selecione uma categoria para o curso.");
        return;
    }
    if (!cargaHoraria) {
        toastErro("Informe a carga horária do curso.");
        return;
    }
    if (!instrutor) {
        toastErro("Informe o instrutor responsável.");
        return;
    }
    if (precoValor === "" || isNaN(precoValor) || Number(precoValor) < 0) {
        toastErro("Informe um preço válido (0 ou maior).");
        return;
    }
    if (listaAulas.some((a) => !a.titulo?.trim() || !a.videoUrl?.trim())) {
        toastErro("Toda videoaula precisa de título e URL preenchidos.");
        return;
    }

    // Normaliza pra sempre terminar em "h" (30, 30h, 30 horas, 30H -> "30h"),
    // igual ao padrão já usado nos cursos originais da plataforma.
    const cargaHorariaFormatada = cargaHoraria.replace(/\s*h(oras?)?\s*$/i, "") + "h";

    const dadosCurso = {
        titulo,
        descricao,
        categoriaId,
        cargaHoraria: cargaHorariaFormatada,
        instrutor,
        preco: parseFloat(precoValor),
        status: overlay.querySelector("#cursoStatus").value
    };

    try {
        let targetCursoId = cursoExistente ? cursoExistente.id : null;

        if (cursoExistente) {
            await fetch(`${API_URL}/cursos/${cursoExistente.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCurso)
            });
        } else {
            dadosCurso.id = "curso_" + Date.now();
            targetCursoId = dadosCurso.id;
            dadosCurso.criadoEm = new Date().toISOString();
            dadosCurso.imagem = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600";

            await fetch(`${API_URL}/cursos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCurso)
            });
        }

        // Deleta as aulas antigas vinculadas a este curso para atualizar com a lista do select
        if (cursoExistente) {
            const respAntigas = await fetch(`${API_URL}/aulas?cursoId=${targetCursoId}`);
            if (respAntigas.ok) {
                const antigas = await respAntigas.json();
                for (const a of antigas) {
                    await fetch(`${API_URL}/aulas/${a.id}`, { method: "DELETE" });
                }
            }
        }

        // Salva todas as aulas organizadas no select na ordem cronológica (1, 2, 3...)
        let ordemNum = 1;
        for (const a of listaAulas) {
            if (a.titulo && a.videoUrl) {
                let urlEmbed = a.videoUrl;
                if (a.videoUrl.includes("watch?v=")) {
                    const videoId = a.videoUrl.split("watch?v=")[1].split("&")[0];
                    urlEmbed = `https://www.youtube-nocookie.com/embed/${videoId}`;
                } else if (a.videoUrl.includes("youtu.be/")) {
                    const videoId = a.videoUrl.split("youtu.be/")[1].split("?")[0];
                    urlEmbed = `https://www.youtube-nocookie.com/embed/${videoId}`;
                }

                const novaAula = {
                    id: `aula_${targetCursoId}_${ordemNum}_${Date.now()}`,
                    cursoId: targetCursoId,
                    ordem: ordemNum,
                    titulo: a.titulo,
                    duracao: a.duracao || "15 min",
                    thumb: a.thumb || "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400",
                    videoUrl: urlEmbed
                };

                await fetch(`${API_URL}/aulas`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(novaAula)
                });

                ordemNum++;
            }
        }

        toastSucesso(cursoExistente ? "Curso e videoaulas atualizados!" : "Novo curso e videoaulas criados!");
        overlay.remove();
        renderCursosPanel();

    } catch (erro) {
        console.error(erro);
        toastErro("Erro ao salvar curso e aulas na API.");
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

    if (nome.length < 3) {
        toastErro("O nome da categoria deve ter no mínimo 3 caracteres.");
        return;
    }

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
                    <div class="password-field">
                        <input type="password" id="usuarioSenha" required minlength="6" value="${escapeHTML(usuario?.senha || "")}">
                        ${TOGGLE_SENHA_HTML("usuarioSenha")}
                    </div>
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
    const nome = overlay.querySelector("#usuarioNome").value.trim();
    const email = overlay.querySelector("#usuarioEmail").value.trim().toLowerCase();
    const senha = overlay.querySelector("#usuarioSenha").value.trim();

    if (nome.length < 3) {
        toastErro("O nome deve ter no mínimo 3 caracteres.");
        return;
    }

    if (!email || !EMAIL_REGEX.test(email)) {
        toastErro("Informe um e-mail válido.");
        return;
    }

    if (!senha) {
        toastErro("A senha é obrigatória.");
        return;
    }

    if (senha.length < 6) {
        toastErro("A senha deve conter pelo menos 6 caracteres.");
        return;
    }

    const dadosUser = {
        nome,
        email,
        senha,
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
        icon: ativoAtual ? "warning" : "question",
        perigoso: ativoAtual
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
