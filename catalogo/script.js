// ==================================================== //
// LÓGICA DO CATÁLOGO DE CURSOS (PÁGINA CATÁLOGO)      //
// ==================================================== //

const API_URL = "http://localhost:3000";

// Elementos da Interface
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");
const navAdminItem = document.getElementById("navAdminItem");
const selectCategoria = document.getElementById("selectCategoria");
const gridCursos = document.getElementById("gridCursos");

// ---------------------------------------------------- //
// 1. VERIFICAÇÃO DE SESSÃO DO USUÁRIO LOGADO           //
// ---------------------------------------------------- //
function verificarSessao() {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");

    // Se não houver usuário logado, redireciona para a página de login
    if (!usuarioSalvo) {
        console.warn("Nenhum usuário logado. Redirecionando para login...");
        window.location.href = "../login/index.html";
        return null;
    }

    const usuario = JSON.parse(usuarioSalvo);

    // Atualiza os elementos da barra de navegação com os dados do usuário
    if (userWelcome) userWelcome.textContent = `Olá, ${usuario.nome}`;
    if (userRoleBadge) {
        userRoleBadge.textContent = usuario.role.toUpperCase();
        userRoleBadge.className = `badge-role ${usuario.role}`;
    }

    // Se o usuário for Admin ou Editor, exibe o link do Painel de Gestão no Header
    if (usuario.role === "admin" || usuario.role === "editor") {
        if (navAdminItem) navAdminItem.classList.remove("hidden");
    }

    return usuario;
}

// ---------------------------------------------------- //
// 2. EFETUAR LOGOUT                                    //
// ---------------------------------------------------- //
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("usuarioLogado"); // Limpa a sessão local
        window.location.href = "../login/index.html"; // Redireciona para o login
    });
}

// ---------------------------------------------------- //
// 3. CARREGAR CATEGORIAS E CURSOS DA API JSON-SERVER   //
// ---------------------------------------------------- //
async function carregarCategorias() {
    try {
        const resp = await fetch(`${API_URL}/categorias`);
        if (!resp.ok) return;

        const categorias = await resp.json();
        
        // Adiciona as opções de categoria no select de filtro
        categorias.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.nome;
            selectCategoria.appendChild(opt);
        });
    } catch (e) {
        console.warn("Não foi possível carregar categorias da API.");
    }
}

async function carregarCursos() {
    gridCursos.innerHTML = "<p class='empty-state'>Carregando cursos...</p>";

    try {
        const [respCursos, respCats] = await Promise.all([
            fetch(`${API_URL}/cursos`),
            fetch(`${API_URL}/categorias`)
        ]);

        if (!respCursos.ok) return;

        const cursos = await respCursos.json();
        const categorias = respCats.ok ? await respCats.json() : [];

        // Filtro por Categoria Selecionada
        const catSelecionada = selectCategoria.value;
        const cursosFiltrados = catSelecionada === "todos" 
            ? cursos 
            : cursos.filter(c => c.categoriaId === catSelecionada);

        gridCursos.innerHTML = "";

        if (cursosFiltrados.length === 0) {
            gridCursos.innerHTML = "<p class='empty-state'>Nenhum curso encontrado nesta categoria.</p>";
            return;
        }

        // Renderização Dinâmica dos Cards de Cursos
        cursosFiltrados.forEach(curso => {
            const catObj = categorias.find(cat => cat.id === curso.categoriaId);
            const nomeCategoria = catObj ? catObj.nome : "Geral";
            const ehPublicado = curso.status === "publicado";

            const cardDiv = document.createElement("div");
            cardDiv.className = "course-card";

            cardDiv.innerHTML = `
                <img src="${curso.imagem || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" alt="${curso.titulo}" class="course-thumb">
                <div class="course-body">
                    <span class="course-category">${nomeCategoria} • ${curso.cargaHoraria || '10h'}</span>
                    <h3 class="course-title">${curso.titulo}</h3>
                    <p class="course-desc">${curso.descricao}</p>
                    
                    <div class="course-footer">
                        <span class="badge-status ${curso.status}">${curso.status.toUpperCase()}</span>
                        <a href="../curso/index.html?id=${curso.id}" class="btn btn-primary btn-sm">
                            ${ehPublicado ? 'Ver Detalhes / Aulas' : 'Visualizar Rascunho'}
                        </a>
                    </div>
                </div>
            `;

            gridCursos.appendChild(cardDiv);
        });

    } catch (erro) {
        console.error("Erro ao carregar cursos:", erro);
        gridCursos.innerHTML = "<p class='empty-state'>Erro de conexão com o servidor json-server.</p>";
    }
}

// ---------------------------------------------------- //
// 4. INICIALIZAÇÃO DA PÁGINA                           //
// ---------------------------------------------------- //
document.addEventListener("DOMContentLoaded", () => {
    verificarSessao();
    carregarCategorias();
    carregarCursos();

    // Re-filtra ao alterar o select de categoria
    selectCategoria.addEventListener("change", carregarCursos);
});
