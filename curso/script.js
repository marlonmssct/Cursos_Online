// ==================================================== //
// LÓGICA DA PÁGINA DINÂMICA DO CURSO (PÁGINA CURSO)   //
// ==================================================== //

const API_URL = "http://localhost:3000";

// Elementos da Interface
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");
const navAdminItem = document.getElementById("navAdminItem");

const courseHeader = document.getElementById("courseHeader");
const courseThumb = document.getElementById("courseThumb");
const lessonsList = document.getElementById("lessonsList");
const reviewsList = document.getElementById("reviewsList");
const enrollmentActions = document.getElementById("enrollmentActions");
const progressBox = document.getElementById("progressBox");
const progressBarFill = document.getElementById("progressBarFill");
const progressText = document.getElementById("progressText");

// ---------------------------------------------------- //
// 1. VERIFICAÇÃO DE SESSÃO                             //
// ---------------------------------------------------- //
function verificarSessao() {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");

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
// 2. CAPTURA DO ID DO CURSO VIA QUERY PARAMETER (URL)  //
// ---------------------------------------------------- //
function obterCursoIdDaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

// ---------------------------------------------------- //
// 3. CARREGAMENTO DINÂMICO DOS DADOS DO CURSO          //
// ---------------------------------------------------- //
async function carregarDetalhesDoCurso() {
    const cursoId = obterCursoIdDaURL();
    const usuario = verificarSessao();

    if (!cursoId) {
        courseHeader.innerHTML = "<h1>Curso Não Encontrado</h1><p>Nenhum identificador de curso foi fornecido na URL.</p>";
        return;
    }

    try {
        // Busca os dados do curso, aulas, matrículas e avaliações em paralelo
        const [respCurso, respAulas, respMatriculas, respAval] = await Promise.all([
            fetch(`${API_URL}/cursos/${cursoId}`),
            fetch(`${API_URL}/aulas?cursoId=${cursoId}`),
            fetch(`${API_URL}/matriculas?cursoId=${cursoId}&usuarioId=${usuario.id}`),
            fetch(`${API_URL}/avaliacoes?cursoId=${cursoId}`)
        ]);

        if (!respCurso.ok) {
            courseHeader.innerHTML = "<h1>Curso Não Encontrado</h1><p>O curso solicitado não existe no banco de dados.</p>";
            return;
        }

        const curso = await respCurso.json();
        const aulas = respAulas.ok ? await respAulas.json() : [];
        const matriculas = respMatriculas.ok ? await respMatriculas.json() : [];
        const avaliacoes = respAval.ok ? await respAval.json() : [];

        const estaMatriculado = matriculas.length > 0;
        const matriculaAtual = estaMatriculado ? matriculas[0] : null;

        // Renderiza o Cabeçalho do Curso
        courseHeader.innerHTML = `
            <span class="badge-status ${curso.status}">${curso.status.toUpperCase()}</span>
            <h1 style="margin-top: 8px;">${curso.titulo}</h1>
            <p style="color: var(--text-muted); font-size: 1.05rem; margin-bottom: 16px;">${curso.descricao}</p>
            <div class="course-meta">
                <span>👤 Instrutor: <strong>${curso.instrutor || 'Equipe Plataforma'}</strong></span>
                <span>⏱️ Carga Horária: <strong>${curso.cargaHoraria || '20h'}</strong></span>
                <span>📖 Aulas: <strong>${aulas.length}</strong></span>
            </div>
        `;

        if (courseThumb) courseThumb.src = curso.imagem || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600';

        // ---------------------------------------------------- //
        // 4. LÓGICA DE MATRÍCULA E PROGRESSO                   //
        // ---------------------------------------------------- //
        if (estaMatriculado) {
            progressBox.classList.remove("hidden");
            const progresso = matriculaAtual.progresso || 0;
            progressBarFill.style.width = `${progresso}%`;
            progressText.textContent = `${progresso}% Concluído`;

            enrollmentActions.innerHTML = `
                <button class="btn btn-secondary btn-block" disabled>✅ Você já está matriculado neste curso</button>
            `;
        } else {
            progressBox.classList.add("hidden");

            // Critério de Aceite: Aluno só pode se matricular em cursos com status "publicado"
            if (curso.status === "publicado") {
                enrollmentActions.innerHTML = `
                    <button id="btnMatricular" class="btn btn-primary btn-block" style="padding: 14px;">
                        🎓 Realizar Matrícula Gratuita
                    </button>
                `;

                document.getElementById("btnMatricular").addEventListener("click", () => {
                    realizarMatricula(usuario.id, curso.id);
                });
            } else {
                enrollmentActions.innerHTML = `
                    <button class="btn btn-secondary btn-block" disabled>🔒 Curso em Rascunho (Matrículas Indisponíveis)</button>
                `;
            }
        }

        // ---------------------------------------------------- //
        // 5. RENDERIZAÇÃO DAS AULAS                           //
        // ---------------------------------------------------- //
        lessonsList.innerHTML = "";
        if (aulas.length === 0) {
            lessonsList.innerHTML = "<p class='text-muted'>Nenhuma aula cadastrada neste curso ainda.</p>";
        } else {
            aulas.sort((a, b) => a.ordem - b.ordem).forEach(aula => {
                const item = document.createElement("div");
                item.className = "lesson-item";
                item.innerHTML = `
                    <div>
                        <strong>Aula ${aula.ordem}: ${aula.titulo}</strong>
                        <br><small style="color: var(--text-muted)">Duração: ${aula.duracao}</small>
                    </div>
                    ${estaMatriculado ? `<button class="btn btn-primary btn-sm" onclick="alert('Assistindo aula: ${aula.titulo}')">Assistir</button>` : `<span style="font-size:0.8rem; color:var(--text-muted)">Matricule-se para assistir</span>`}
                `;
                lessonsList.appendChild(item);
            });
        }

        // ---------------------------------------------------- //
        // 6. RENDERIZAÇÃO DAS AVALIAÇÕES                       //
        // ---------------------------------------------------- //
        reviewsList.innerHTML = "";
        if (avaliacoes.length === 0) {
            reviewsList.innerHTML = "<p class='text-muted'>Este curso ainda não possui avaliações.</p>";
        } else {
            avaliacoes.forEach(av => {
                const revCard = document.createElement("div");
                revCard.className = "review-card";
                revCard.innerHTML = `
                    <strong>${av.usuarioNome}</strong> <span>${'⭐'.repeat(av.nota)}</span>
                    <p style="font-size: 0.9rem; margin-top: 4px;">"${av.comentario}"</p>
                `;
                reviewsList.appendChild(revCard);
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar curso:", erro);
        courseHeader.innerHTML = "<h1>Erro ao Carregar Curso</h1><p>Não foi possível comunicar com o servidor.</p>";
    }
}

// Função para efetuar a matrícula do aluno
async function realizarMatricula(usuarioId, cursoId) {
    try {
        const novaMatricula = {
            id: "mat_" + Date.now(),
            usuarioId: usuarioId,
            cursoId: cursoId,
            progresso: 10, // Começa com 10%
            dataMatricula: new Date().toISOString()
        };

        const resp = await fetch(`${API_URL}/matriculas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novaMatricula)
        });

        if (resp.ok) {
            alert("Parabéns! Sua matrícula foi realizada com sucesso.");
            carregarDetalhesDoCurso(); // Recarrega a página para atualizar a interface
        }
    } catch (e) {
        alert("Erro ao realizar matrícula.");
    }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    carregarDetalhesDoCurso();
});
