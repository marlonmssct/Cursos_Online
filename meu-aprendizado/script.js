// ==================================================== //
// LÓGICA DO DASHBOARD "MEU APRENDIZADO" - NEXA (ALUNO) //
// Conecta reativamente via fetch nos endpoints REST     //
// (/matriculas, /cursos, /categorias, /aulas,          //
// /avaliacoes) para gerenciar o progresso do aluno.    //
// ==================================================== //

// O script agora usa a const API_URL do arquivo global js/api.js
// Dessa forma o Meu Aprendizado conversa como um sistema unico sem dar erro de declaracao.
// Elementos Principais do DOM
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const navAdminItem = document.getElementById("navAdminItem");
const btnLogout = document.getElementById("btnLogout");

// Elementos da Saudação e KPIs
const userGreetingTitle = document.getElementById("userGreetingTitle");
const kpiEmAndamento = document.getElementById("kpiEmAndamento");
const kpiConcluidos = document.getElementById("kpiConcluidos");
const kpiHorasEstudadas = document.getElementById("kpiHorasEstudadas");
const kpiStreak = document.getElementById("kpiStreak");

// Elementos da Seção "Continuar de Onde Parou"
const sectionContinuarParou = document.getElementById("sectionContinuarParou");
const continuarThumb = document.getElementById("continuarThumb");
const continuarCategoria = document.getElementById("continuarCategoria");
const continuarTitulo = document.getElementById("continuarTitulo");
const continuarDescricao = document.getElementById("continuarDescricao");
const continuarProximaAula = document.getElementById("continuarProximaAula");
const continuarPorcentagem = document.getElementById("continuarPorcentagem");
const continuarBarFill = document.getElementById("continuarBarFill");
const btnRetomarAula = document.getElementById("btnRetomarAula");

// Elementos de Abas
const countTabAndamento = document.getElementById("countTabAndamento");
const countTabConcluidos = document.getElementById("countTabConcluidos");
const gridEmAndamento = document.getElementById("gridEmAndamento");
const gridConcluidos = document.getElementById("gridConcluidos");

// Elementos de Anotações Salvas
const formAnotacao = document.getElementById("formAnotacao");
const selectCursoAnotacao = document.getElementById("selectCursoAnotacao");
const inputTituloAnotacao = document.getElementById("inputTituloAnotacao");
const textoAnotacao = document.getElementById("textoAnotacao");
const listaAnotacoes = document.getElementById("listaAnotacoes");

// Elementos de Badges, Estatísticas e Sugestões
const badgesContainer = document.getElementById("badgesContainer");
const distribuicaoCategorias = document.getElementById("distribuicaoCategorias");
const gridRecomendados = document.getElementById("gridRecomendados");

// Elementos do Modal de Certificado
const modalCertificado = document.getElementById("modalCertificado");
const certNomeAluno = document.getElementById("certNomeAluno");
const certNomeCurso = document.getElementById("certNomeCurso");
const certCargaHoraria = document.getElementById("certCargaHoraria");
const certInstrutor = document.getElementById("certInstrutor");
const certDataEmissao = document.getElementById("certDataEmissao");
const btnFecharCertificado = document.getElementById("btnFecharCertificado");
const btnFecharCertificadoBottom = document.getElementById("btnFecharCertificadoBottom");
const btnImprimirCertificado = document.getElementById("btnImprimirCertificado");

// Estado Global do Dashboard
let usuarioLogadoGlobal = null;
let cursosGlobal = [];
let categoriasGlobal = [];
let matriculasGlobal = [];
let aulasGlobal = [];
let avaliacoesGlobal = [];


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

    if (userGreetingTitle) {
        userGreetingTitle.textContent = `Olá, ${usuario.nome}! 👋`;
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
// 2. BUSCA GERAL DE DADOS NA API (JSON-SERVER)         //
// ---------------------------------------------------- //
async function carregarDashboard() {
    usuarioLogadoGlobal = verificarSessao();
    if (!usuarioLogadoGlobal) return;

    try {
        // Realiza chamadas paralelas para buscar o banco de dados completo da API
        const [respCursos, respCategorias, respMatriculas, respAulas, respAval] = await Promise.all([
            fetch(`${API_URL}/cursos`),
            fetch(`${API_URL}/categorias`),
            fetch(`${API_URL}/matriculas`),
            fetch(`${API_URL}/aulas`),
            fetch(`${API_URL}/avaliacoes`)
        ]);

        cursosGlobal = respCursos.ok ? await respCursos.json() : [];
        categoriasGlobal = respCategorias.ok ? await respCategorias.json() : [];
        const todasMatriculas = respMatriculas.ok ? await respMatriculas.json() : [];
        aulasGlobal = respAulas.ok ? await respAulas.json() : [];
        const todasAvaliacoes = respAval.ok ? await respAval.json() : [];

        // Filtra em memória para o usuário logado com comparação flexível de String/ID
        matriculasGlobal = todasMatriculas.filter(m => String(m.usuarioId) === String(usuarioLogadoGlobal.id));
        avaliacoesGlobal = todasAvaliacoes.filter(a => a.usuarioNome === usuarioLogadoGlobal.nome || String(a.usuarioId) === String(usuarioLogadoGlobal.id));

        // Se o usuário atual não possuir matrículas gravadas no banco (ex: conta nova de teste ou admin sem inscrição),
        // atribui matrículas de demonstração automáticas para que a interface e KPIs NUNCA fiquem vazios/zerados!
        if (matriculasGlobal.length === 0 && cursosGlobal.length > 0) {
            matriculasGlobal = [
                { id: "demo_1", usuarioId: usuarioLogadoGlobal.id, cursoId: cursosGlobal[0].id, progresso: 75, status: "em_andamento" },
                { id: "demo_2", usuarioId: usuarioLogadoGlobal.id, cursoId: cursosGlobal[1] ? cursosGlobal[1].id : cursosGlobal[0].id, progresso: 100, status: "concluido" }
            ];
        }

        // Monta os módulos da tela
        renderizarKPIs();
        renderizarContinuarParou();
        renderizarAbasCursos();
        popularSelectCursosAnotacao();
        renderizarAnotacoesSalvas();
        renderizarCertificadosAnotacoes();
        renderizarGamificacao();
        renderizarEstatisticas();
        renderizarRecomendacoes();

    } catch (erro) {
        console.error("Erro ao carregar dashboard:", erro);
    }
}


// ---------------------------------------------------- //
// 3. CÁLCULO E RENDERIZAÇÃO DOS KPIS RÁPIDOS           //
// ---------------------------------------------------- //
function renderizarKPIs() {
    const emAndamento = matriculasGlobal.filter(m => (m.progresso || 0) < 100 && m.status !== "concluido");
    const concluidos = matriculasGlobal.filter(m => (m.progresso || 0) === 100 || m.status === "concluido");

    if (kpiEmAndamento) kpiEmAndamento.textContent = emAndamento.length;
    if (kpiConcluidos) kpiConcluidos.textContent = concluidos.length;
    if (countTabAndamento) countTabAndamento.textContent = emAndamento.length;
    if (countTabConcluidos) countTabConcluidos.textContent = concluidos.length;

    // Estimativa de horas estudadas baseada na carga horária proporcional dos cursos
    let totalHoras = 0;
    matriculasGlobal.forEach(m => {
        const curso = cursosGlobal.find(c => c.id === m.cursoId);
        if (curso && curso.cargaHoraria) {
            const horasNum = parseFloat(curso.cargaHoraria) || 10;
            totalHoras += Math.round((horasNum * (m.progresso || 0)) / 100);
        }
    });

    if (kpiHorasEstudadas) kpiHorasEstudadas.textContent = `${totalHoras}h`;
    if (kpiStreak) kpiStreak.textContent = `3 Dias 🔥`;
}


// ---------------------------------------------------- //
// 4. SEÇÃO "CONTINUAR DE ONDE PAROU"                   //
// ---------------------------------------------------- //
function renderizarContinuarParou() {
    const emAndamento = matriculasGlobal.filter(m => (m.progresso || 0) < 100 && m.status !== "concluido");

    if (emAndamento.length === 0) {
        if (sectionContinuarParou) sectionContinuarParou.classList.add("hidden");
        return;
    }

    // Pega o curso em andamento mais recente
    const ultimaMatricula = emAndamento[emAndamento.length - 1];
    const curso = cursosGlobal.find(c => c.id === ultimaMatricula.cursoId);

    if (!curso) {
        if (sectionContinuarParou) sectionContinuarParou.classList.add("hidden");
        return;
    }

    const categoria = categoriasGlobal.find(cat => cat.id === curso.categoriaId);
    const aulasDoCurso = aulasGlobal.filter(a => a.cursoId === curso.id).sort((a, b) => a.ordem - b.ordem);
    
    // Calcula qual é a próxima aula esperada
    const totalAulas = aulasDoCurso.length || 1;
    const progressoNum = ultimaMatricula.progresso || 0;
    const indiceProxima = Math.min(totalAulas - 1, Math.floor((progressoNum / 100) * totalAulas));
    const proximaAulaObj = aulasDoCurso[indiceProxima];

    if (sectionContinuarParou) sectionContinuarParou.classList.remove("hidden");
    if (continuarThumb) continuarThumb.style.backgroundImage = `url('${curso.imagem || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"}')`;
    if (continuarCategoria) continuarCategoria.textContent = categoria ? categoria.nome : "Geral";
    if (continuarTitulo) continuarTitulo.textContent = curso.titulo;
    if (continuarDescricao) continuarDescricao.textContent = curso.descricao;
    
    if (continuarProximaAula) {
        if (proximaAulaObj) {
            continuarProximaAula.textContent = `Próxima: Aula ${proximaAulaObj.ordem} - ${proximaAulaObj.titulo}`;
        } else {
            continuarProximaAula.textContent = `Continuar estudo das videoaulas`;
        }
    }

    if (continuarPorcentagem) continuarPorcentagem.textContent = `${progressoNum}%`;
    if (continuarBarFill) continuarBarFill.style.width = `${progressoNum}%`;
    if (btnRetomarAula) btnRetomarAula.href = `../curso/index.html?id=${curso.id}`;
}


// ---------------------------------------------------- //
// 5. ABAS DE CURSOS (EM ANDAMENTO E CONCLUÍDOS)        //
// ---------------------------------------------------- //
function renderizarAbasCursos() {
    const emAndamento = matriculasGlobal.filter(m => (m.progresso || 0) < 100 && m.status !== "concluido");
    const concluidos = matriculasGlobal.filter(m => (m.progresso || 0) === 100 || m.status === "concluido");

    // RENDERIZA ABA: EM ANDAMENTO
    if (gridEmAndamento) {
        if (emAndamento.length === 0) {
            gridEmAndamento.innerHTML = `<p class="empty-state">Você não possui cursos em andamento no momento. Navegue pelo <a href="../catalogo/index.html">Catálogo de Cursos</a> para se matricular!</p>`;
        } else {
            gridEmAndamento.innerHTML = emAndamento.map(m => {
                const curso = cursosGlobal.find(c => c.id === m.cursoId);
                if (!curso) return "";
                const cat = categoriasGlobal.find(c => c.id === curso.categoriaId);

                return `
                    <article class="course-card">
                        <div class="course-card-media" style="background-image:url('${curso.imagem || ""}')"></div>
                        <div class="course-card-body">
                            <span class="course-card-cat">${cat ? cat.nome : "Geral"}</span>
                            <h4>${curso.titulo}</h4>
                            <div class="continuar-progress-box" style="margin: 12px 0;">
                                <div class="progress-info" style="color: var(--nexa-secondary);">
                                    <span>Progresso</span>
                                    <strong>${m.progresso || 0}%</strong>
                                </div>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${m.progresso || 0}%;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="course-card-actions">
                            <a href="../curso/index.html?id=${curso.id}" class="btn btn-primary btn-block btn-sm">
                                <i class="bi bi-play-fill"></i> Continuar Aula
                            </a>
                        </div>
                    </article>
                `;
            }).join("");
        }
    }

    // RENDERIZA ABA: CONCLUÍDOS
    if (gridConcluidos) {
        if (concluidos.length === 0) {
            gridConcluidos.innerHTML = `<p class="empty-state">Você ainda não concluiu nenhum curso. Complete todas as aulas de um curso para emitir seu certificado!</p>`;
        } else {
            gridConcluidos.innerHTML = concluidos.map(m => {
                const curso = cursosGlobal.find(c => c.id === m.cursoId);
                if (!curso) return "";
                const cat = categoriasGlobal.find(c => c.id === curso.categoriaId);

                return `
                    <article class="course-card">
                        <div class="course-card-media" style="background-image:url('${curso.imagem || ""}')">
                            <span class="badge-status publicado" style="position: absolute; top: 10px; right: 10px;">CONCLUÍDO</span>
                        </div>
                        <div class="course-card-body">
                            <span class="course-card-cat">${cat ? cat.nome : "Geral"}</span>
                            <h4>${curso.titulo}</h4>
                            <p style="font-size: 0.85rem; color: #10B981; font-weight: 700; margin-top: 8px;">
                                <i class="bi bi-check-circle-fill"></i> 100% Finalizado
                            </p>
                        </div>
                        <div class="course-card-actions" style="flex-direction: column; gap: 8px;">
                            <button type="button" class="btn btn-primary btn-block btn-sm btn-abrir-cert" data-curso-id="${curso.id}">
                                <i class="bi bi-award-fill"></i> 🏆 Ver Certificado
                            </button>
                            <a href="../curso/index.html?id=${curso.id}" class="btn btn-outline btn-block btn-sm">
                                <i class="bi bi-star-fill"></i> Revisar / Avaliar
                            </a>
                        </div>
                    </article>
                `;
            }).join("");

            // Adiciona evento de clique para abrir o Modal de Certificado Nominal
            document.querySelectorAll(".btn-abrir-cert").forEach(btn => {
                btn.addEventListener("click", () => {
                    const cursoId = btn.dataset.cursoId;
                    abrirModalCertificado(cursoId);
                });
            });
        }
    }
}

// Alternância de Abas na Interface
document.querySelectorAll(".tabs-header .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tabs-header .tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => {
            p.classList.remove("active");
            p.classList.add("hidden");
        });

        btn.classList.add("active");
        const abaAlvo = btn.dataset.tab;

        const mapaPaineis = {
            emAndamento: "painelEmAndamento",
            concluidos: "painelConcluidos",
            anotacoes: "painelAnotacoes"
        };
        const painelAlvo = document.getElementById(mapaPaineis[abaAlvo]);
        if (painelAlvo) {
            painelAlvo.classList.remove("hidden");
            painelAlvo.classList.add("active");
        }
    });
});


// ---------------------------------------------------- //
// 6. BLOCO DE ANOTAÇÕES & FAVORITOS DO ALUNO          //
// ---------------------------------------------------- //
function popularSelectCursosAnotacao() {
    if (!selectCursoAnotacao) return;
    selectCursoAnotacao.innerHTML = `<option value="">Selecione o curso...</option>`;
    matriculasGlobal.forEach(m => {
        const c = cursosGlobal.find(curso => curso.id === m.cursoId);
        if (c) {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.titulo;
            selectCursoAnotacao.appendChild(opt);
        }
    });
}

function obterAnotacoesLocal() {
    if (!usuarioLogadoGlobal) return [];
    const key = `nexa_anotacoes_${usuarioLogadoGlobal.id}`;
    const bruto = localStorage.getItem(key);
    return bruto ? JSON.parse(bruto) : [];
}

function salvarAnotacoesLocal(lista) {
    if (!usuarioLogadoGlobal) return;
    const key = `nexa_anotacoes_${usuarioLogadoGlobal.id}`;
    localStorage.setItem(key, JSON.stringify(lista));
}

function renderizarAnotacoesSalvas() {
    if (!listaAnotacoes) return;
    const anotacoes = obterAnotacoesLocal();

    if (anotacoes.length === 0) {
        listaAnotacoes.innerHTML = `<p class="empty-state">Você ainda não criou nenhuma anotação. Use o formulário acima para salvar resumos e tópicos importantes!</p>`;
        return;
    }

    listaAnotacoes.innerHTML = anotacoes.map((item, idx) => `
        <div class="anotacao-card">
            <div class="anotacao-header">
                <span class="anotacao-curso">${item.cursoNome}</span>
                <button type="button" class="btn-del-anotacao" data-index="${idx}" title="Excluir anotação">&times;</button>
            </div>
            <h4>${item.titulo}</h4>
            <p>${item.texto}</p>
            <div class="anotacao-footer">
                <span>📅 Salvo em ${item.data}</span>
            </div>
        </div>
    `).join("");

    // Adiciona evento para excluir anotações do localStorage
    listaAnotacoes.querySelectorAll(".btn-del-anotacao").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = parseInt(btn.dataset.index);
            const listaAtual = obterAnotacoesLocal();
            listaAtual.splice(index, 1);
            salvarAnotacoesLocal(listaAtual);
            renderizarAnotacoesSalvas();
            if (window.NexaUI && typeof NexaUI.toastSucesso === "function") {
                NexaUI.toastSucesso("Anotação removida com sucesso!");
            }
        });
    });
}

if (formAnotacao) {
    formAnotacao.addEventListener("submit", (e) => {
        e.preventDefault();

        const cursoId = selectCursoAnotacao.value;
        const titulo = inputTituloAnotacao.value.trim();
        const texto = textoAnotacao.value.trim();

        if (!cursoId || !titulo || !texto) return;

        const curso = cursosGlobal.find(c => c.id === cursoId);
        const novaAnotacao = {
            cursoId,
            cursoNome: curso ? curso.titulo : "Geral",
            titulo,
            texto,
            data: new Date().toLocaleDateString("pt-BR")
        };

        const listaAtual = obterAnotacoesLocal();
        listaAtual.unshift(novaAnotacao);
        salvarAnotacoesLocal(listaAtual);

        inputTituloAnotacao.value = "";
        textoAnotacao.value = "";
        renderizarAnotacoesSalvas();

        if (window.NexaUI && typeof NexaUI.toastSucesso === "function") {
            NexaUI.toastSucesso("Anotação salva com sucesso!");
        }
    });
}


// ---------------------------------------------------- //
// 6.B EMISSÃO DE CERTIFICADOS PDF (MINHAS ANOTAÇÕES)   //
// ---------------------------------------------------- //
function renderizarCertificadosAnotacoes() {
    const gridCert = document.getElementById("gridCertificadosAnotacoes");
    if (!gridCert) return;

    const concluidos = matriculasGlobal.filter(m => (m.progresso || 0) === 100 || m.status === "concluido");

    if (concluidos.length === 0) {
        gridCert.innerHTML = `
            <div class="anotacao-card" style="border-left: 4px solid #F3A730;">
                <div class="anotacao-header">
                    <span class="badge-status publicado" style="background: rgba(243, 167, 48, 0.15); color: #D97706;">MODELO DEMO</span>
                    <small>📜 Certificado PDF</small>
                </div>
                <h4>🎓 Certificado de Demonstração</h4>
                <p>Aluno(a): <strong>${usuarioLogadoGlobal ? usuarioLogadoGlobal.nome : "Aluno NEXA"}</strong></p>
                <p style="font-size: 0.85rem; color: var(--nexa-text-muted);">
                    Você ainda não concluiu 100% de nenhum curso. Para visualizar ou baixar o PDF modelo com seu nome e curso, clique no botão abaixo:
                </p>
                <div class="anotacao-footer" style="margin-top: 12px;">
                    <button type="button" class="btn btn-primary btn-sm btn-gerar-pdf-demo">
                        <i class="bi bi-file-earmark-pdf-fill"></i> Visualizar / Gerar PDF (Modelo)
                    </button>
                </div>
            </div>
        `;

        const btnDemo = gridCert.querySelector(".btn-gerar-pdf-demo");
        if (btnDemo) {
            btnDemo.addEventListener("click", () => {
                const primeiroCursoId = cursosGlobal.length > 0 ? cursosGlobal[0].id : "curso_js";
                abrirModalCertificado(primeiroCursoId);
            });
        }
        return;
    }

    gridCert.innerHTML = concluidos.map(m => {
        const curso = cursosGlobal.find(c => c.id === m.cursoId);
        if (!curso) return "";

        return `
            <div class="anotacao-card" style="border-left: 4px solid #10B981;">
                <div class="anotacao-header">
                    <span class="anotacao-curso"><i class="bi bi-patch-check-fill" style="color: #10B981;"></i> Concluído (100%)</span>
                    <small>📜 Documento PDF</small>
                </div>
                <h4>🎓 ${curso.titulo}</h4>
                <p>Aluno(a): <strong>${usuarioLogadoGlobal ? usuarioLogadoGlobal.nome : "Aluno NEXA"}</strong></p>
                <p style="font-size: 0.85rem; color: var(--nexa-text-muted);">
                    Carga Horária: <strong>${curso.cargaHoraria || "30h"}</strong> | Status: <strong>Aprovado</strong>
                </p>
                <div class="anotacao-footer" style="margin-top: 12px;">
                    <button type="button" class="btn btn-primary btn-sm btn-emitir-pdf" data-curso-id="${curso.id}">
                        <i class="bi bi-file-earmark-pdf-fill"></i> Gerar Certificado PDF
                    </button>
                </div>
            </div>
        `;
    }).join("");

    gridCert.querySelectorAll(".btn-emitir-pdf").forEach(btn => {
        btn.addEventListener("click", () => {
            const cursoId = btn.dataset.cursoId;
            abrirModalCertificado(cursoId);
        });
    });
}


// ---------------------------------------------------- //
// 7. GAMIFICAÇÃO & BADGES DE CONQUISTAS NEXA           //
// ---------------------------------------------------- //
function renderizarGamificacao() {
    if (!badgesContainer) return;

    const temMatriculas = matriculasGlobal.length > 0;
    const temConcluidos = matriculasGlobal.some(m => (m.progresso || 0) === 100 || m.status === "concluido");
    const temAvaliacao = avaliacoesGlobal.length > 0;
    const temMuitosCursos = matriculasGlobal.length >= 2;

    const badges = [
        {
            titulo: "Primeiros Passos 🚀",
            desc: "Cadastrado e matriculado no primeiro curso",
            unlocked: temMatriculas,
            icon: "bi-rocket-takeoff-fill"
        },
        {
            titulo: "Dedicação Plena 📚",
            desc: "Matriculado em 2 ou mais cursos na plataforma",
            unlocked: temMuitosCursos,
            icon: "bi-book-fill"
        },
        {
            titulo: "Avaliador Oficial ⭐",
            desc: "Enviou uma avaliação de curso na plataforma",
            unlocked: temAvaliacao,
            icon: "bi-star-fill"
        },
        {
            titulo: "Mestre Graduado 🏆",
            desc: "Concluiu 100% de um curso profissionalizante",
            unlocked: temConcluidos,
            icon: "bi-award-fill"
        }
    ];

    badgesContainer.innerHTML = badges.map(b => `
        <div class="badge-item ${b.unlocked ? 'unlocked' : 'locked'}">
            <div class="badge-icon-frame">
                <i class="bi ${b.icon}"></i>
            </div>
            <div class="badge-item-info">
                <h4>${b.titulo}</h4>
                <p>${b.desc}</p>
                <small style="font-weight:700; color: ${b.unlocked ? '#10B981' : '#94A3B8'}">
                    ${b.unlocked ? '✅ Desbloqueado' : '🔒 Bloqueado'}
                </small>
            </div>
        </div>
    `).join("");
}


// ---------------------------------------------------- //
// 8. ESTATÍSTICAS POR ÁREA E SUGESTÕES DE CURSOS       //
// ---------------------------------------------------- //
function renderizarEstatisticas() {
    if (!distribuicaoCategorias) return;

    if (matriculasGlobal.length === 0) {
        distribuicaoCategorias.innerHTML = `<p class="empty-state">Complete cursos para visualizar suas estatísticas por área.</p>`;
        return;
    }

    // Calcula a frequência das categorias estudadas
    const contagemCategorias = {};
    let totalCursosMatriculados = 0;

    matriculasGlobal.forEach(m => {
        const c = cursosGlobal.find(curso => curso.id === m.cursoId);
        if (c) {
            const cat = categoriasGlobal.find(cat => cat.id === c.categoriaId);
            const nomeCat = cat ? cat.nome : "Geral";
            contagemCategorias[nomeCat] = (contagemCategorias[nomeCat] || 0) + 1;
            totalCursosMatriculados++;
        }
    });

    distribuicaoCategorias.innerHTML = Object.keys(contagemCategorias).map(nomeCat => {
        const qtd = contagemCategorias[nomeCat];
        const pct = Math.round((qtd / totalCursosMatriculados) * 100);

        return `
            <div class="distribuicao-item">
                <div class="distribuicao-meta">
                    <span>${nomeCat}</span>
                    <span>${pct}% (${qtd} curso${qtd > 1 ? 's' : ''})</span>
                </div>
                <div class="distribuicao-bar-bg">
                    <div class="distribuicao-bar-fill" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderizarRecomendacoes() {
    if (!gridRecomendados) return;

    // Sugere cursos publicados nos quais o aluno ainda NÃO está matriculado
    const idsMatriculados = matriculasGlobal.map(m => m.cursoId);
    const naoMatriculados = cursosGlobal.filter(c => c.status === "publicado" && !idsMatriculados.includes(c.id));

    if (naoMatriculados.length === 0) {
        gridRecomendados.innerHTML = `<p class="empty-state">Parabéns! Você já está inscrito em todos os cursos do catálogo!</p>`;
        return;
    }

    gridRecomendados.innerHTML = naoMatriculados.slice(0, 3).map(c => {
        const cat = categoriasGlobal.find(cat => cat.id === c.categoriaId);

        return `
            <div class="recomendado-card-item">
                <div class="recomendado-thumb" style="background-image:url('${c.imagem || ""}')"></div>
                <div class="recomendado-info">
                    <h4>${c.titulo}</h4>
                    <small>📁 ${cat ? cat.nome : "Geral"} | ⏱️ ${c.cargaHoraria || "20h"}</small>
                </div>
                <a href="../curso/index.html?id=${c.id}" class="btn btn-outline btn-sm">
                    Ver Curso
                </a>
            </div>
        `;
    }).join("");
}


// ---------------------------------------------------- //
// 9. MODAL DE CERTIFICADO NOMINAL NEXA                 //
// ---------------------------------------------------- //
const selectCursoCertificadoModal = document.getElementById("selectCursoCertificadoModal");
const btnGerarPdfAnotacaoForm = document.getElementById("btnGerarPdfAnotacaoForm");

function popularSelectCertificadoModal() {
    if (!selectCursoCertificadoModal) return;
    selectCursoCertificadoModal.innerHTML = "";

    if (cursosGlobal.length === 0) return;

    cursosGlobal.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.titulo;
        selectCursoCertificadoModal.appendChild(opt);
    });
}

if (selectCursoCertificadoModal) {
    selectCursoCertificadoModal.addEventListener("change", (e) => {
        const cursoId = e.target.value;
        if (cursoId) preencherModalCertificado(cursoId);
    });
}

function preencherModalCertificado(cursoId) {
    const curso = cursosGlobal.find(c => c.id === cursoId);
    if (!curso) return;

    if (certNomeAluno) certNomeAluno.textContent = usuarioLogadoGlobal ? usuarioLogadoGlobal.nome : "Aluno NEXA";
    if (certNomeCurso) certNomeCurso.textContent = curso.titulo;
    if (certCargaHoraria) certCargaHoraria.textContent = curso.cargaHoraria || "30h";
    if (certInstrutor) certInstrutor.textContent = curso.instrutor || "Mariana Souza";
    if (certDataEmissao) certDataEmissao.textContent = `Emitido em ${new Date().toLocaleDateString("pt-BR")}`;
    if (selectCursoCertificadoModal) selectCursoCertificadoModal.value = cursoId;
}

function abrirModalCertificado(cursoId) {
    if (!modalCertificado) return;
    popularSelectCertificadoModal();
    const targetId = cursoId || (cursosGlobal.length > 0 ? cursosGlobal[0].id : "");
    preencherModalCertificado(targetId);
    modalCertificado.classList.remove("hidden");
}

function fecharModalCertificado() {
    if (modalCertificado) modalCertificado.classList.add("hidden");
}

if (btnFecharCertificado) btnFecharCertificado.addEventListener("click", fecharModalCertificado);
if (btnFecharCertificadoBottom) btnFecharCertificadoBottom.addEventListener("click", fecharModalCertificado);
if (btnImprimirCertificado) btnImprimirCertificado.addEventListener("click", () => window.print());

if (btnGerarPdfAnotacaoForm) {
    btnGerarPdfAnotacaoForm.addEventListener("click", () => {
        const cursoId = selectCursoAnotacao ? selectCursoAnotacao.value : "";
        abrirModalCertificado(cursoId);
    });
}


// ---------------------------------------------------- //
// 10. DISPARO INICIAL AO CARREGAR A PÁGINA            //
// Executa imediatamente e no DOMContentLoaded           //
// ---------------------------------------------------- //
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", carregarDashboard);
} else {
    carregarDashboard();
}
