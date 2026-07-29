// ==================================================== //
// LÓGICA DA SALA DE AULA - NAVEGAÇÃO, THUMBS & PLAYER  //
// ==================================================== //

const API_URL = "http://localhost:3000";

// Elementos da Interface
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");
const navAdminItem = document.getElementById("navAdminItem");

// Elementos do Modo Foco e Player
const playerFocusSection = document.getElementById("playerFocusSection");
const videoPlayer = document.getElementById("videoPlayer");
const aulaTituloAtual = document.getElementById("aulaTituloAtual");
const btnAulaAnterior = document.getElementById("btnAulaAnterior");
const btnProximaAula = document.getElementById("btnProximaAula");

// Playlist e Seções
const courseHeader = document.getElementById("courseHeader");
const courseThumb = document.getElementById("courseThumb");
const playlistAulas = document.getElementById("playlistAulas");
const reviewsList = document.getElementById("reviewsList");
const enrollmentActions = document.getElementById("enrollmentActions");
const progressBox = document.getElementById("progressBox");
const progressBarFill = document.getElementById("progressBarFill");
const progressText = document.getElementById("progressText");

// Seção e Formulário de Avaliação
const sectionAvaliacao = document.getElementById("sectionAvaliacao");
const formAvaliacao = document.getElementById("formAvaliacao");
const selectNota = document.getElementById("selectNota");
const inputComentario = document.getElementById("inputComentario");

// Estado Global da Sala de Aula
let listaAulasOrdenadas = [];
let indiceAulaAtual = 0;
let matriculaAlunoLogado = null;
let usuarioLogadoGlobal = null;
let imagemCursoPadrao = "";


// ---------------------------------------------------- //
// 1. VERIFICAÇÃO DE SESSÃO DO USUÁRIO LOGADO           //
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

function obterCursoIdDaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

// Helper: Formata qualquer link do YouTube (Vídeo único ou Playlist) para o domínio seguro nocookie
function formatarUrlVideoEmbed(url) {
    if (!url) return "https://www.youtube-nocookie.com/embed/WRlfwBof66s?rel=0&enablejsapi=1";

    let videoId = "";

    // 1. Se for link de Playlist pura (youtube.com/playlist?list=ID)
    if (url.includes("playlist?list=")) {
        const playlistId = url.split("playlist?list=")[1].split("&")[0];
        return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&rel=0&enablejsapi=1`;
    }

    // 2. Extrai o ID do vídeo para qualquer padrão de URL do YouTube
    if (url.includes("watch?v=")) {
        videoId = url.split("watch?v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("/embed/")) {
        videoId = url.split("/embed/")[1].split("?")[0];
    }

    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&enablejsapi=1`;
    }

    return url;
}


// ---------------------------------------------------- //
// 2. CARREGAMENTO DINÂMICO DOS DADOS E AULAS           //
// ---------------------------------------------------- //
async function carregarSalaDeAula() {
    const cursoId = obterCursoIdDaURL();
    usuarioLogadoGlobal = verificarSessao();

    if (!cursoId) {
        courseHeader.innerHTML = "<h1>Curso Não Encontrado</h1><p>Forneça um ID de curso válido na URL (ex: ?id=curso_js).</p>";
        return;
    }

    try {
        const [respCurso, respAulas, respMatriculas, respAval] = await Promise.all([
            fetch(`${API_URL}/cursos/${cursoId}`),
            fetch(`${API_URL}/aulas?cursoId=${cursoId}`),
            fetch(`${API_URL}/matriculas?cursoId=${cursoId}&usuarioId=${usuarioLogadoGlobal.id}`),
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

        imagemCursoPadrao = curso.imagem || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600';
        listaAulasOrdenadas = aulas.sort((a, b) => a.ordem - b.ordem);
        
        matriculaAlunoLogado = matriculas.length > 0 ? matriculas[0] : null;
        const estaMatriculado = matriculaAlunoLogado !== null;

        // Renderiza o Cabeçalho
        courseHeader.innerHTML = `
            <span class="badge-status ${curso.status}">${curso.status.toUpperCase()}</span>
            <h1 style="margin-top: 10px;">${curso.titulo}</h1>
            <p style="color: var(--nexa-text-muted); font-size: 1.05rem; margin-bottom: 16px;">${curso.descricao}</p>
            <div class="course-meta">
                <span>👤 Instrutor: <strong>${curso.instrutor || 'Equipe NEXA'}</strong></span>
                <span>⏱️ Carga Horária: <strong>${curso.cargaHoraria || '20h'}</strong></span>
                <span>📖 Total de Aulas: <strong>${listaAulasOrdenadas.length}</strong></span>
            </div>
        `;

        if (courseThumb) courseThumb.src = imagemCursoPadrao;

        // ---------------------------------------------------- //
        // 3. SEÇÃO DE MATRÍCULA E PROGRESSO                    //
        // ---------------------------------------------------- //
        if (estaMatriculado) {
            progressBox.classList.remove("hidden");
            const progresso = matriculaAlunoLogado.progresso || 0;
            progressBarFill.style.width = `${progresso}%`;
            progressText.textContent = `${progresso}% Concluído`;

            enrollmentActions.innerHTML = `
                <button class="btn btn-secondary btn-block" disabled>✅ Você está matriculado neste curso</button>
            `;

            // Se tiver aulas, habilita o Player em Modo Foco
            if (listaAulasOrdenadas.length > 0) {
                playerFocusSection.classList.remove("hidden");
                carregarAulaNoPlayer(0); // Inicia pela primeira aula
            }

            verificarEExibirAvaliacao(curso.id, usuarioLogadoGlobal, progresso, matriculaAlunoLogado.status);

        } else {
            progressBox.classList.add("hidden");
            playerFocusSection.classList.add("hidden");
            sectionAvaliacao.classList.add("hidden");

            if (curso.status === "publicado") {
                enrollmentActions.innerHTML = `
                    <button id="btnMatricular" class="btn btn-primary btn-block">
                        🎓 Realizar Matrícula Gratuita
                    </button>
                `;

                document.getElementById("btnMatricular").addEventListener("click", () => {
                    realizarMatricula(usuarioLogadoGlobal.id, curso.id);
                });
            } else {
                enrollmentActions.innerHTML = `
                    <button class="btn btn-secondary btn-block" disabled>🔒 Curso em Rascunho</button>
                `;
            }
        }

        // Renderiza a Playlist com Fotos Thumbnail
        renderizarPlaylist(estaMatriculado);
        renderizarAvaliacoes(avaliacoes);

    } catch (erro) {
        console.error("Erro ao carregar sala de aula:", erro);
        courseHeader.innerHTML = "<h1>Erro de Conexão</h1><p>Servidor offline na porta 3000.</p>";
    }
}


// ---------------------------------------------------- //
// 4. PLAYER DE VÍDEO COMPACTO (RODA NO PRÓPRIO SITE)   //
// ---------------------------------------------------- //
function carregarAulaNoPlayer(index) {
    if (index < 0 || index >= listaAulasOrdenadas.length) return;

    indiceAulaAtual = index;
    const aula = listaAulasOrdenadas[index];

    // Formata o link para embed do próprio site
    const videoEmbedUrl = formatarUrlVideoEmbed(aula.videoUrl);
    videoPlayer.src = videoEmbedUrl;
    aulaTituloAtual.textContent = `Aula ${aula.ordem}: ${aula.titulo}`;

    // Atualiza estado dos botões Anterior / Próxima
    btnAulaAnterior.disabled = (indiceAulaAtual === 0);
    btnProximaAula.disabled = (indiceAulaAtual === listaAulasOrdenadas.length - 1);

    // Destaca a aula ativa na playlist
    const itensPlaylist = document.querySelectorAll(".lesson-item");
    itensPlaylist.forEach((item, idx) => {
        if (idx === index) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });
}

btnAulaAnterior.addEventListener("click", () => {
    if (indiceAulaAtual > 0) {
        carregarAulaNoPlayer(indiceAulaAtual - 1);
    }
});

btnProximaAula.addEventListener("click", () => {
    if (indiceAulaAtual < listaAulasOrdenadas.length - 1) {
        const proximoIndice = indiceAulaAtual + 1;
        carregarAulaNoPlayer(proximoIndice);
        atualizarProgressoAluno(proximoIndice);
    }
});

async function atualizarProgressoAluno(indiceAulaConcluida) {
    if (!matriculaAlunoLogado) return;

    const totalAulas = listaAulasOrdenadas.length;
    const novoProgresso = Math.min(100, Math.round(((indiceAulaConcluida + 1) / totalAulas) * 100));
    const ehConcluido = novoProgresso === 100;

    try {
        const dadosAtualizacao = { progresso: novoProgresso };
        if (ehConcluido) dadosAtualizacao.status = "concluido";

        await fetch(`${API_URL}/matriculas/${matriculaAlunoLogado.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosAtualizacao)
        });

        matriculaAlunoLogado.progresso = novoProgresso;
        progressBarFill.style.width = `${novoProgresso}%`;
        progressText.textContent = `${novoProgresso}% Concluído`;

        if (ehConcluido) {
            alert("🎉 Parabéns! Você concluiu 100% das aulas deste curso!");
            sectionAvaliacao.classList.remove("hidden");
        }

    } catch (e) {
        console.warn("Erro ao atualizar progresso.");
    }
}


// ---------------------------------------------------- //
// 5. PLAYLIST COM FOTOS ESTILO THUMBNAIL               //
// ---------------------------------------------------- //
function renderizarPlaylist(estaMatriculado) {
    playlistAulas.innerHTML = "";

    if (listaAulasOrdenadas.length === 0) {
        playlistAulas.innerHTML = "<p class='empty-state'>Nenhuma aula disponível neste curso.</p>";
        return;
    }

    listaAulasOrdenadas.forEach((aula, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = `lesson-item ${index === 0 && estaMatriculado ? 'active' : ''}`;

        // Imagem da miniatura / thumbnail da aula
        const urlThumb = aula.thumb || imagemCursoPadrao;

        itemDiv.innerHTML = `
            <!-- Foto Estilo Thumbnail da Aula -->
            <div class="lesson-thumb-wrapper">
                <img src="${urlThumb}" alt="${aula.titulo}" class="lesson-thumb-img">
                <div class="play-badge-icon">▶</div>
            </div>

            <!-- Informações da Aula -->
            <div class="lesson-info-content">
                <strong>Aula ${aula.ordem}: ${aula.titulo}</strong>
                <small>⏱️ Duração: ${aula.duracao}</small>
            </div>

            ${estaMatriculado 
                ? `<span class="badge-status publicado" style="font-size:0.7rem;">▶ Assistir</span>` 
                : `<span style="font-size:0.75rem; color:var(--nexa-text-muted)">🔒 Bloqueado</span>`}
        `;

        if (estaMatriculado) {
            itemDiv.addEventListener("click", () => {
                carregarAulaNoPlayer(index);
            });
        }

        playlistAulas.appendChild(itemDiv);
    });
}


// ---------------------------------------------------- //
// 6. AVALIAÇÕES E REGRAS DE MATRÍCULA                  //
// ---------------------------------------------------- //
async function verificarEExibirAvaliacao(cursoId, usuario, progresso, statusMatricula) {
    const ehConcluido = progresso === 100 || statusMatricula === "concluido";

    if (!ehConcluido) {
        sectionAvaliacao.classList.add("hidden");
        return;
    }

    sectionAvaliacao.classList.remove("hidden");

    try {
        const respChecagem = await fetch(`${API_URL}/avaliacoes?cursoId=${cursoId}&usuarioNome=${encodeURIComponent(usuario.nome)}`);
        
        if (respChecagem.ok) {
            const jaAvaliou = await respChecagem.json();
            if (jaAvaliou.length > 0) {
                formAvaliacao.innerHTML = `
                    <div class="feedback-box success">
                        ✅ Você já enviou sua avaliação para este curso. Obrigado!
                    </div>
                `;
            }
        }
    } catch (e) {
        console.warn("Checagem de avaliação ignorada.");
    }
}

formAvaliacao.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cursoId = obterCursoIdDaURL();
    const nota = Number(selectNota.value);
    const comentario = inputComentario.value.trim();

    if (!comentario) return;

    try {
        const novaAvaliacao = {
            id: "av_" + Date.now(),
            cursoId: cursoId,
            usuarioNome: usuarioLogadoGlobal.nome,
            nota: nota,
            comentario: comentario,
            data: new Date().toISOString()
        };

        const resp = await fetch(`${API_URL}/avaliacoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novaAvaliacao)
        });

        if (resp.ok) {
            alert("Sua avaliação foi enviada com sucesso!");
            carregarSalaDeAula();
        }
    } catch (e) {
        alert("Erro ao enviar avaliação.");
    }
});

async function realizarMatricula(usuarioId, cursoId) {
    try {
        const novaMatricula = {
            id: "mat_" + Date.now(),
            usuarioId: usuarioId,
            cursoId: cursoId,
            progresso: 10,
            status: "em_andamento",
            dataMatricula: new Date().toISOString()
        };

        const resp = await fetch(`${API_URL}/matriculas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novaMatricula)
        });

        if (resp.ok) {
            alert("Parabéns! Sua matrícula foi realizada com sucesso.");
            carregarSalaDeAula();
        }
    } catch (e) {
        alert("Erro ao realizar matrícula.");
    }
}

function renderizarAvaliacoes(avaliacoes) {
    reviewsList.innerHTML = "";

    if (avaliacoes.length === 0) {
        reviewsList.innerHTML = "<p class='empty-state'>Este curso ainda não possui avaliações da comunidade.</p>";
        return;
    }

    avaliacoes.forEach(av => {
        const revCard = document.createElement("div");
        revCard.className = "review-card";
        revCard.innerHTML = `
            <strong>👤 ${av.usuarioNome}</strong> <span style="color:var(--nexa-warning)">${'⭐'.repeat(av.nota)}</span>
            <p style="font-size: 0.9rem; margin-top: 6px; color: var(--nexa-text-main)">"${av.comentario}"</p>
        `;
        reviewsList.appendChild(revCard);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    carregarSalaDeAula();
});
