// ==================================================== //
// LÓGICA DO CATÁLOGO DE CURSOS & MEUS CURSOS (NEXA)    //
// ==================================================== //

const API_URL = "http://localhost:3000";

// Elementos da Interface
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");
const navAdminItem = document.getElementById("navAdminItem");

// Seções e Grids
const secaoMeusCursos = document.getElementById("secaoMeusCursos");
const gridMeusCursos = document.getElementById("gridMeusCursos");
const gridCursos = document.getElementById("gridCursos");

// Filtros de Busca
const inputBuscaTexto = document.getElementById("inputBuscaTexto");
const selectCategoria = document.getElementById("selectCategoria");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");

// Variáveis de estado global para filtragem em tempo real
let listaTodosCursos = [];
let listaCategorias = [];


// ---------------------------------------------------- //
// 1. VERIFICAÇÃO DE SESSÃO DO USUÁRIO LOGADO           //
// ---------------------------------------------------- //
function verificarSessao() {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");

    // Redireciona para o login caso não esteja autenticado
    if (!usuarioSalvo) {
        window.location.href = "../login/index.html";
        return null;
    }

    const usuario = JSON.parse(usuarioSalvo);

    if (userWelcome) userWelcome.textContent = `Olá, ${usuario.nome}`;
    if (userRoleBadge) {
        userRoleBadge.textContent = usuario.role.toUpperCase();
        userRoleBadge.className = `badge-role ${usuario.role}`;
    }

    // Exibe link do Painel de Gestão se for Admin ou Editor
    if ((usuario.role === "admin" || usuario.role === "editor") && navAdminItem) {
        navAdminItem.classList.remove("hidden");
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
// 2. SEÇÃO: MEUS CURSOS (BARRA DE PROGRESSO & MATRÍCULA)//
// ---------------------------------------------------- //
async function carregarMeusCursos(usuarioId) {
    try {
        // Busca as matrículas do usuário logado e os dados dos cursos
        const [respMatriculas, respCursos] = await Promise.all([
            fetch(`${API_URL}/matriculas?usuarioId=${usuarioId}`),
            fetch(`${API_URL}/cursos`)
        ]);

        if (!respMatriculas.ok || !respCursos.ok) return;

        const matriculas = await respMatriculas.json();
        const cursos = await respCursos.json();

        // Se o aluno não tiver matrículas, oculta a seção "Meus Cursos"
        if (matriculas.length === 0) {
            secaoMeusCursos.classList.add("hidden");
            return;
        }

        secaoMeusCursos.classList.remove("hidden");
        gridMeusCursos.innerHTML = "";

        // Renderiza cada curso no qual o aluno está matriculado
        matriculas.forEach(mat => {
            const curso = cursos.find(c => c.id === mat.cursoId);
            if (!curso) return;

            const progresso = mat.progresso !== undefined ? mat.progresso : 0;
            const ehConcluido = progresso === 100 || mat.status === "concluido";

            const cardDiv = document.createElement("div");
            cardDiv.className = "course-card";

            cardDiv.innerHTML = `
                <img src="${curso.imagem || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" alt="${curso.titulo}" class="course-thumb">
                <div class="course-body">
                    <span class="course-category">SEU CURSO • ${curso.cargaHoraria || '10h'}</span>
                    <h3 class="course-title">${curso.titulo}</h3>
                    
                    <!-- Barra de Progresso Visual (0 a 100%) -->
                    <div class="progress-card-box">
                        <div class="progress-card-label">
                            <span>Progresso</span>
                            <span>${progresso}%</span>
                        </div>
                        <div class="progress-card-bar-bg">
                            <div class="progress-card-bar-fill" style="width: ${progresso}%;"></div>
                        </div>
                    </div>

                    <div class="course-footer">
                        <span class="badge-status ${ehConcluido ? 'publicado' : 'rascunho'}">
                            ${ehConcluido ? '✅ CONCLUÍDO' : '⏳ EM ANDAMENTO'}
                        </span>
                        <a href="../curso/index.html?id=${curso.id}" class="btn btn-primary btn-sm">
                            ▶ Continuar
                        </a>
                    </div>
                </div>
            `;

            gridMeusCursos.appendChild(cardDiv);
        });

    } catch (e) {
        console.warn("Erro ao carregar Meus Cursos:", e);
    }
}


// ---------------------------------------------------- //
// 3. SEÇÃO: EXPLORAR CURSOS (FILTROS E BUSCA POR TEXTO)//
// ---------------------------------------------------- //
async function carregarCategorias() {
    try {
        const resp = await fetch(`${API_URL}/categorias`);
        if (!resp.ok) return;

        listaCategorias = await resp.json();
        
        selectCategoria.innerHTML = `<option value="todos">Todas as Categorias</option>`;
        listaCategorias.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.nome;
            selectCategoria.appendChild(opt);
        });
    } catch (e) {
        console.warn("Não foi possível carregar categorias.");
    }
}

async function carregarTodosCursos() {
    gridCursos.innerHTML = "<p class='empty-state'>Carregando cursos para explorar...</p>";

    try {
        // Busca apenas cursos publicados
        const resp = await fetch(`${API_URL}/cursos?status=publicado`);
        if (!resp.ok) return;

        listaTodosCursos = await resp.json();
        filtrarERenderizarCursos();

    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);
        gridCursos.innerHTML = "<p class='empty-state'>Servidor offline na porta 3000.</p>";
    }
}

// Função de Filtragem em Tempo Real (Texto + Categoria)
function filtrarERenderizarCursos() {
    const textoBusca = inputBuscaTexto.value.trim().toLowerCase();
    const catId = selectCategoria.value;

    // Aplica o filtro duplo (Texto e Categoria)
    const cursosFiltrados = listaTodosCursos.filter(curso => {
        const bateTexto = curso.titulo.toLowerCase().includes(textoBusca) || 
                          curso.descricao.toLowerCase().includes(textoBusca) ||
                          (curso.instrutor && curso.instrutor.toLowerCase().includes(textoBusca));
        
        const bateCategoria = (catId === "todos") || (curso.categoriaId === catId);

        return bateTexto && bateCategoria;
    });

    gridCursos.innerHTML = "";

    if (cursosFiltrados.length === 0) {
        gridCursos.innerHTML = `
            <div class="empty-state">
                <p>Nenhum curso encontrado para a pesquisa <strong>"${inputBuscaTexto.value}"</strong>.</p>
            </div>
        `;
        return;
    }

    cursosFiltrados.forEach(curso => {
        const catObj = listaCategorias.find(cat => cat.id === curso.categoriaId);
        const nomeCategoria = catObj ? catObj.nome : "Geral";

        const cardDiv = document.createElement("div");
        cardDiv.className = "course-card";

        cardDiv.innerHTML = `
            <img src="${curso.imagem || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" alt="${curso.titulo}" class="course-thumb">
            <div class="course-body">
                <span class="course-category">${nomeCategoria} • ${curso.cargaHoraria || '10h'}</span>
                <h3 class="course-title">${curso.titulo}</h3>
                <p class="course-desc">${curso.descricao}</p>
                
                <div class="course-footer">
                    <span class="badge-status publicado">PUBLICADO</span>
                    <a href="../curso/index.html?id=${curso.id}" class="btn btn-primary btn-sm">
                        Ver Detalhes
                    </a>
                </div>
            </div>
        `;

        gridCursos.appendChild(cardDiv);
    });
}


// ---------------------------------------------------- //
// 4. EVENTOS DE BUSCA E LIMPEZA                        //
// ---------------------------------------------------- //
inputBuscaTexto.addEventListener("input", filtrarERenderizarCursos);
selectCategoria.addEventListener("change", filtrarERenderizarCursos);

btnLimparFiltros.addEventListener("click", () => {
    inputBuscaTexto.value = "";
    selectCategoria.value = "todos";
    filtrarERenderizarCursos();
});


// ---------------------------------------------------- //
// 5. INICIALIZAÇÃO DA PÁGINA                           //
// ---------------------------------------------------- //
document.addEventListener("DOMContentLoaded", () => {
    const usuario = verificarSessao();
    if (usuario) {
        carregarMeusCursos(usuario.id);
    }
    carregarCategorias();
    carregarTodosCursos();
});
