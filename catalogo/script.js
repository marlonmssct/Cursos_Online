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
// 0. ILUSTRAÇÕES DOS ESTADOS DA LISTA                   //
// SVG embutido (sem requisição externa) usando as cores  //
// oficiais da paleta — por isso combinam com o resto     //
// do site em qualquer estado da tela.                    //
// ---------------------------------------------------- //
const ART_CARREGANDO = `
    <svg class="empty-art" viewBox="0 0 64 64" role="img" aria-label="Carregando conteúdo">
        <circle cx="32" cy="32" r="24" fill="none" stroke="#E4E2E7" stroke-width="6"/>
        <circle cx="32" cy="32" r="24" fill="none" stroke="#F3A730" stroke-width="6"
                stroke-linecap="round" stroke-dasharray="38 114">
            <animateTransform attributeName="transform" type="rotate"
                              from="0 32 32" to="360 32 32" dur="1.1s" repeatCount="indefinite"/>
        </circle>
    </svg>
`;

const ART_BUSCA_VAZIA = `
    <svg class="empty-art" viewBox="0 0 64 64" role="img" aria-label="Nenhum resultado encontrado">
        <circle cx="28" cy="28" r="16" fill="#EEF1FB" stroke="#3A4171" stroke-width="3"/>
        <line x1="40" y1="40" x2="53" y2="53" stroke="#2D1C52" stroke-width="5" stroke-linecap="round"/>
        <line x1="22" y1="22" x2="34" y2="34" stroke="#F3A730" stroke-width="3" stroke-linecap="round"/>
        <line x1="34" y1="22" x2="22" y2="34" stroke="#F3A730" stroke-width="3" stroke-linecap="round"/>
    </svg>
`;

const ART_SEM_CONEXAO = `
    <svg class="empty-art" viewBox="0 0 64 64" role="img" aria-label="Servidor indisponível">
        <rect x="10" y="14" width="44" height="14" rx="4" fill="#F1EDF9" stroke="#2D1C52" stroke-width="3"/>
        <rect x="10" y="36" width="44" height="14" rx="4" fill="#FEF2F2" stroke="#EF4444" stroke-width="3"/>
        <circle cx="18" cy="21" r="2.6" fill="#3A4171"/>
        <circle cx="18" cy="43" r="2.6" fill="#EF4444"/>
        <path d="M40 39 l8 8 M48 39 l-8 8" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
    </svg>
`;


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
    btnLogout.addEventListener("click", async () => {
        // Confirmação antes de encerrar a sessão: evita o clique acidental
        // no botão que fica ao lado do ícone de perfil.
        if (window.NexaUI) {
            const confirmado = await NexaUI.confirmar({
                titulo: "Sair da plataforma?",
                texto: "Você precisará entrar novamente com seu e-mail e senha.",
                confirmText: "Sair",
                cancelText: "Continuar estudando",
                icon: "question",
                perigoso: false
            });
            if (!confirmado) return;
        }

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
    gridCursos.innerHTML = `
        <div class="empty-state">
            ${ART_CARREGANDO}
            <strong>Carregando cursos para explorar...</strong>
        </div>
    `;

    try {
        // Busca apenas cursos publicados
        const resp = await fetch(`${API_URL}/cursos?status=publicado`);
        if (!resp.ok) return;

        listaTodosCursos = await resp.json();
        filtrarERenderizarCursos();

    } catch (erro) {
        console.error("Erro ao carregar catálogo:", erro);
        gridCursos.innerHTML = `
            <div class="empty-state">
                ${ART_SEM_CONEXAO}
                <strong>Não foi possível falar com o servidor</strong>
                <p>O json-server precisa estar rodando na porta 3000. Inicie com <code>npx json-server db.json</code>.</p>
            </div>
        `;
        if (window.NexaUI) NexaUI.toastErro("Servidor offline na porta 3000.");
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
                ${ART_BUSCA_VAZIA}
                <strong>Nenhum curso encontrado</strong>
                <p>Nada corresponde à pesquisa <strong>"${inputBuscaTexto.value}"</strong>. Tente outra palavra ou troque a categoria.</p>
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
    const jaEstavaLimpo = inputBuscaTexto.value === "" && selectCategoria.value === "todos";

    inputBuscaTexto.value = "";
    selectCategoria.value = "todos";
    filtrarERenderizarCursos();

    if (window.NexaUI && !jaEstavaLimpo) NexaUI.toastSucesso("Filtros limpos. Exibindo o catálogo completo.");
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

    // Fundo em malha animada do banner (puramente decorativo).
    // Se o WebGL/Vanta não estiver disponível, o gradiente CSS continua no lugar.
    if (window.NexaUI) NexaUI.iniciarVanta(".hero-banner");
});
