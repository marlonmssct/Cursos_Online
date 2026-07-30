// ==================================================== //
// LÓGICA DA SALA DE AULA - NAVEGAÇÃO, THUMBS & PLAYER  //
// ==================================================== //

// O script agora usa a const API_URL do arquivo global js/api.js

// Elementos da Interface
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");
const navAdminItem = document.getElementById("navAdminItem");

// Elementos do Modo Foco e Player
const playerFocusSection = document.getElementById("playerFocusSection");
const videoPlayer = document.getElementById("videoPlayer");
const videoPlayerErro = document.getElementById("videoPlayerErro");
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
    let usuario = null;

    if (typeof Sessao !== "undefined" && typeof Sessao.getUsuario === "function") {
        usuario = Sessao.getUsuario();
    } else {
        const bruto = localStorage.getItem("usuarioLogado");
        usuario = bruto ? JSON.parse(bruto) : null;
    }

    if (!usuario) {
        window.location.href = "../login/index.html";
        return null;
    }

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
    btnLogout.addEventListener("click", async () => {
        // Confirmação antes de encerrar a sessão: o aluno pode estar no meio de uma aula.
        if (window.NexaUI) {
            const confirmado = await NexaUI.confirmar({
                titulo: "Sair da plataforma?",
                texto: "Seu progresso já está salvo, mas você precisará entrar novamente para continuar.",
                confirmText: "Sair",
                cancelText: "Continuar estudando",
                icon: "question",
                perigoso: false
            });
            if (!confirmado) return;
        }

        if (typeof Sessao !== "undefined" && typeof Sessao.logout === "function") {
            Sessao.logout();
        } else {
            localStorage.removeItem("usuarioLogado");
        }
        window.location.href = "../login/index.html";
    });
}

function obterCursoIdDaURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
}

// Helper: Formata qualquer link do YouTube (Vídeo único ou Playlist) para o domínio seguro nocookie.
// Retorna null quando a URL não pôde ser reconhecida, para o chamador exibir um estado de erro
// em vez de jogar um valor inválido no src do iframe.
function formatarUrlVideoEmbed(url) {
    if (!url) return "https://www.youtube-nocookie.com/embed/WRlfwBof66s?rel=0&enablejsapi=1";

    const urlLimpa = url.trim();

    // 1. Link de Playlist pura (youtube.com/playlist?list=ID)
    const matchPlaylist = urlLimpa.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (urlLimpa.includes("playlist?list=") && matchPlaylist) {
        return `https://www.youtube-nocookie.com/embed/videoseries?list=${matchPlaylist[1]}&rel=0&enablejsapi=1`;
    }

    // 2. Extrai o ID do vídeo cobrindo os formatos mais comuns do YouTube
    const padroesId = [
        /(?:watch\?v=|[?&]v=)([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /\/embed\/([a-zA-Z0-9_-]{11})/,
        /\/shorts\/([a-zA-Z0-9_-]{11})/,
        /\/live\/([a-zA-Z0-9_-]{11})/
    ];

    let videoId = "";
    for (const padrao of padroesId) {
        const match = urlLimpa.match(padrao);
        if (match) {
            videoId = match[1];
            break;
        }
    }

    // 3. Se nenhum padrão de URL bateu, aceita o valor como um ID puro de 11 caracteres
    if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(urlLimpa)) {
        videoId = urlLimpa;
    }

    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&enablejsapi=1`;
    }

    return null;
}

function obterCursoIdDaURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

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
        
        // Se o curso tiver videoUrl cadastrado no Admin mas nenhuma aula salva no banco, gera dinamicamente as aulas da playlist/vídeo:
        if (listaAulasOrdenadas.length === 0 && curso.videoUrl) {
            const urlFormatada = formatarUrlVideoEmbed(curso.videoUrl);
            if (curso.videoUrl.includes("playlist?list=")) {
                listaAulasOrdenadas = [
                    { id: "aula_dyn_1", cursoId: curso.id, ordem: 1, titulo: "Módulo 1: Introdução & Conceitos Iniciais", duracao: "20 min", videoUrl: urlFormatada, thumb: imagemCursoPadrao },
                    { id: "aula_dyn_2", cursoId: curso.id, ordem: 2, titulo: "Módulo 2: Prática Hands-on & Exercícios", duracao: "35 min", videoUrl: urlFormatada, thumb: imagemCursoPadrao },
                    { id: "aula_dyn_3", cursoId: curso.id, ordem: 3, titulo: "Módulo 3: Projeto Prático & Conclusão", duracao: "40 min", videoUrl: urlFormatada, thumb: imagemCursoPadrao }
                ];
            } else {
                listaAulasOrdenadas = [
                    { id: "aula_dyn_1", cursoId: curso.id, ordem: 1, titulo: `Aula Principal: ${curso.titulo}`, duracao: "30 min", videoUrl: urlFormatada, thumb: imagemCursoPadrao }
                ];
            }
        }

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

            if (curso.status === "publicado" && Number(curso.preco) > 0) {
                const precoFormatado = Number(curso.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

                enrollmentActions.innerHTML = `
                    <button id="btnMatricular" class="btn btn-primary btn-block">
                        💳 Matricular-se — ${precoFormatado}
                    </button>
                `;

                document.getElementById("btnMatricular").addEventListener("click", async () => {
                    // PIX embutido: o modal com o QR Code já funciona como a etapa de
                    // confirmação (o aluno pode simplesmente fechar se desistir).
                    try {
                        const resultado = await NexaPagamento.abrirPagamentoPixMercadoPago(curso, usuarioLogadoGlobal);

                        if (resultado.pago) {
                            await realizarMatricula(usuarioLogadoGlobal.id, curso.id, {
                                valorPago: resultado.valor
                            });
                        } else if (resultado.motivo === "expirado" && window.NexaUI) {
                            NexaUI.erro({
                                titulo: "PIX expirado",
                                texto: "O código expirou antes da confirmação. Clique em matricular-se de novo para gerar um novo PIX."
                            });
                        }
                        // motivo "cancelado": o aluno só fechou o modal, sem necessidade de aviso.
                    } catch (erroPagamento) {
                        console.error("Erro ao gerar PIX:", erroPagamento);
                        if (window.NexaUI) {
                            NexaUI.erro({
                                titulo: "Não foi possível gerar o PIX",
                                texto: erroPagamento.message || "Tente novamente em instantes."
                            });
                        }
                    }
                });
            } else if (curso.status === "publicado") {
                enrollmentActions.innerHTML = `
                    <button id="btnMatricular" class="btn btn-primary btn-block">
                        🎓 Realizar Matrícula Gratuita
                    </button>
                `;

                document.getElementById("btnMatricular").addEventListener("click", async () => {
                    // Confirmação antes de gravar a matrícula na API
                    if (window.NexaUI) {
                        const confirmado = await NexaUI.confirmar({
                            titulo: "Confirmar matrícula?",
                            texto: `Você entrará no curso "${curso.titulo}" e poderá assistir a todas as aulas imediatamente.`,
                            confirmText: "Quero me matricular",
                            cancelText: "Agora não",
                            icon: "question",
                            perigoso: false
                        });
                        if (!confirmado) return;
                    }

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
function dataLocalYMD(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

// Marca o dia de hoje na frequência semanal do aluno (exibida em "Meu Aprendizado").
// Só faz PATCH quando hoje ainda não estava registrado, pra não repetir a cada troca de aula.
async function registrarDiaDeEstudo() {
    if (!usuarioLogadoGlobal) return;

    const hoje = dataLocalYMD(new Date());
    const diasEstudo = usuarioLogadoGlobal.diasEstudo || [];
    if (diasEstudo.includes(hoje)) return;

    const novosDias = [...diasEstudo, hoje];

    try {
        const resp = await fetch(`${API_URL}/usuarios/${usuarioLogadoGlobal.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ diasEstudo: novosDias })
        });
        if (resp.ok) {
            usuarioLogadoGlobal.diasEstudo = novosDias;
            if (typeof Sessao !== "undefined" && typeof Sessao.setUsuario === "function") {
                Sessao.setUsuario(usuarioLogadoGlobal);
            } else {
                localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogadoGlobal));
            }
        }
    } catch (erro) {
        console.warn("Não foi possível registrar o dia de estudo.", erro);
    }
}

function carregarAulaNoPlayer(index) {
    if (index < 0 || index >= listaAulasOrdenadas.length) return;

    indiceAulaAtual = index;
    registrarDiaDeEstudo();
    const aula = listaAulasOrdenadas[index];
    const ehUltimaAula = (index === listaAulasOrdenadas.length - 1);

    // Formata o link para embed do próprio site
    const videoEmbedUrl = formatarUrlVideoEmbed(aula.videoUrl);

    if (videoEmbedUrl) {
        videoPlayer.classList.remove("hidden");
        videoPlayerErro.classList.add("hidden");
        videoPlayer.src = videoEmbedUrl;
    } else {
        videoPlayer.classList.add("hidden");
        videoPlayer.src = "about:blank";
        videoPlayerErro.classList.remove("hidden");
        videoPlayerErro.textContent = "⚠️ Não foi possível carregar este vídeo. O link cadastrado para esta aula é inválido.";
    }

    aulaTituloAtual.textContent = `Aula ${aula.ordem}: ${aula.titulo}`;

    // Atualiza estado e texto dos botões de navegação
    btnAulaAnterior.disabled = (indiceAulaAtual === 0);
    
    if (ehUltimaAula) {
        btnProximaAula.disabled = false;
        btnProximaAula.innerHTML = "🎓 Concluir & Avaliar";
        btnProximaAula.className = "btn btn-primary btn-sm btn-concluir-final";
    } else {
        btnProximaAula.disabled = false;
        btnProximaAula.innerHTML = "⏭️ Próxima Aula";
        btnProximaAula.className = "btn btn-primary btn-sm";
    }

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

btnAulaAnterior.addEventListener("click", async () => {
    if (indiceAulaAtual > 0) {
        const prevIdx = indiceAulaAtual - 1;
        carregarAulaNoPlayer(prevIdx);
        await atualizarProgressoAluno(prevIdx);
    }
});

btnProximaAula.addEventListener("click", async () => {
    if (indiceAulaAtual < listaAulasOrdenadas.length - 1) {
        const proximoIndice = indiceAulaAtual + 1;
        carregarAulaNoPlayer(proximoIndice);
        await atualizarProgressoAluno(proximoIndice);
    } else {
        // Já está na última aula! Marca 100% concluído e rola suavemente para a avaliação:
        await atualizarProgressoAluno(indiceAulaAtual);
        sectionAvaliacao.scrollIntoView({ behavior: "smooth" });
    }
});

async function atualizarProgressoAluno(indiceAulaConcluida) {
    if (!matriculaAlunoLogado) return;

    const totalAulas = listaAulasOrdenadas.length;
    const ehUltimaAula = (indiceAulaConcluida === totalAulas - 1);
    const novoProgresso = ehUltimaAula ? 100 : Math.min(100, Math.round(((indiceAulaConcluida + 1) / totalAulas) * 100));
    const ehConcluido = (novoProgresso === 100);

    const progressoAtual = matriculaAlunoLogado.progresso || 0;

    if (novoProgresso > progressoAtual || ehUltimaAula) {
        try {
            const dadosAtualizacao = { progresso: novoProgresso };
            if (ehConcluido) dadosAtualizacao.status = "concluido";

            await fetch(`${API_URL}/matriculas/${matriculaAlunoLogado.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosAtualizacao)
            });

            const avancou = novoProgresso > progressoAtual;

            matriculaAlunoLogado.progresso = novoProgresso;
            if (ehConcluido) matriculaAlunoLogado.status = "concluido";

            progressBarFill.style.width = `${novoProgresso}%`;
            progressText.textContent = `${novoProgresso}% Concluído`;

            // Feedback só quando o progresso realmente avança (evita repetir
            // a mensagem ao reabrir uma aula que o aluno já assistiu).
            if (avancou && window.NexaUI) {
                if (ehConcluido) {
                    NexaUI.toastSucesso("🎓 Curso concluído! Avalie logo abaixo.");
                } else {
                    NexaUI.toastSucesso(`Progresso salvo: ${novoProgresso}%`);
                }
            }

        } catch (e) {
            console.warn("Erro ao atualizar progresso.");
            if (window.NexaUI) NexaUI.toastErro("Não foi possível salvar seu progresso.");
        }
    }

    // Se estiver na última aula ou com 100%, libera a seção de avaliação imediatamente!
    if (ehConcluido || ehUltimaAula) {
        verificarEExibirAvaliacao(obterCursoIdDaURL(), usuarioLogadoGlobal, 100, "concluido");
    }
}


// ---------------------------------------------------- //
// 5. PLAYLIST COM FOTOS ESTILO THUMBNAIL               //
// ---------------------------------------------------- //
function renderizarPlaylist(estaMatriculado) {
    playlistAulas.innerHTML = "";

    if (listaAulasOrdenadas.length === 0) {
        playlistAulas.innerHTML = `
            <div class="empty-state">
                <svg class="empty-art" viewBox="0 0 64 64" role="img" aria-label="Curso ainda sem aulas">
                    <rect x="8" y="14" width="48" height="32" rx="5" fill="#F1EDF9" stroke="#2D1C52" stroke-width="3"/>
                    <path d="M27 26 L39 32 L27 38 Z" fill="#E4E2E7"/>
                    <path d="M16 52 h32" stroke="#E4E2E7" stroke-width="4" stroke-linecap="round"/>
                </svg>
                <strong>Nenhuma aula publicada ainda</strong>
                <p>Assim que a equipe de conteúdo cadastrar as videoaulas, elas aparecem aqui.</p>
            </div>
        `;
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
            itemDiv.addEventListener("click", async () => {
                carregarAulaNoPlayer(index);
                await atualizarProgressoAluno(index);
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

    if (!comentario || comentario.length < 5) {
        if (window.NexaUI) {
            NexaUI.toastErro("Escreva um comentário com pelo menos 5 caracteres.");
        }
        return;
    }

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
            if (window.NexaUI) {
                await NexaUI.sucesso({
                    titulo: "Avaliação enviada!",
                    texto: "Obrigado por ajudar outros alunos a escolherem melhor.",
                    confirmText: "De nada!"
                });
            }
            carregarSalaDeAula();
        }
    } catch (e) {
        if (window.NexaUI) {
            NexaUI.erro({
                titulo: "Não foi possível enviar",
                texto: "Verifique se o servidor json-server está rodando na porta 3000 e tente de novo."
            });
        }
    }
});

async function realizarMatricula(usuarioId, cursoId, extras = {}) {
    try {
        // Progresso inicial reflete 1 aula concluída sobre o total do curso
        // (mesma conta usada ao longo do curso: (índice + 1) / totalAulas).
        const respAulasCurso = await fetch(`${API_URL}/aulas?cursoId=${cursoId}`);
        const aulasCurso = respAulasCurso.ok ? await respAulasCurso.json() : [];
        const progressoInicial = aulasCurso.length > 0 ? Math.round((1 / aulasCurso.length) * 100) : 0;

        const novaMatricula = {
            id: "mat_" + Date.now(),
            usuarioId: usuarioId,
            cursoId: cursoId,
            progresso: progressoInicial,
            status: "em_andamento",
            dataMatricula: new Date().toISOString(),
            ...extras // checkoutId/valorPago, quando a matrícula vem de um pagamento confirmado
        };

        const resp = await fetch(`${API_URL}/matriculas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novaMatricula)
        });

        if (resp.ok) {
            if (window.NexaUI) {
                await NexaUI.marca({
                    titulo: "Matrícula confirmada!",
                    texto: "Bons estudos! A primeira aula já está liberada no player acima.",
                    confirmText: "Começar a assistir"
                });
            }
            carregarSalaDeAula();
        }
    } catch (e) {
        if (window.NexaUI) {
            NexaUI.erro({
                titulo: "Não foi possível matricular",
                texto: "Verifique se o servidor json-server está rodando na porta 3000 e tente de novo."
            });
        }
    }
}

function renderizarAvaliacoes(avaliacoes) {
    reviewsList.innerHTML = "";

    if (avaliacoes.length === 0) {
        reviewsList.innerHTML = `
            <div class="empty-state">
                <svg class="empty-art" viewBox="0 0 64 64" role="img" aria-label="Curso ainda sem avaliações">
                    <path d="M32 10 l6.2 12.6 13.9 2 -10 9.8 2.4 13.8 L32 41.7 19.5 48.2 l2.4 -13.8 -10 -9.8 13.9 -2 Z"
                          fill="#FFF5E6" stroke="#F3A730" stroke-width="3" stroke-linejoin="round"/>
                    <path d="M26 30 h12" stroke="#F3A730" stroke-width="3" stroke-linecap="round" opacity=".5"/>
                </svg>
                <strong>Seja o primeiro a avaliar</strong>
                <p>Ainda não há comentários da comunidade neste curso. Conclua as aulas para deixar o seu.</p>
            </div>
        `;
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
