// ==================================================== //
// MODAL DE PERFIL COMPARTILHADO — NEXA                  //
// Injetado em qualquer página logada (catálogo, curso,  //
// painel de gestão) via <script src="../js/perfil-modal.js">. //
// Autocontido em uma IIFE: não declara nada no escopo    //
// global, então não colide com o API_URL/Sessao já        //
// existentes (ou duplicados) em cada página.             //
//                                                        //
// Regra de negócio (historias_usuario_cursos.md, US02):  //
// o usuário edita apenas nome e senha; o role NUNCA é     //
// editável pelo próprio usuário. Exceção: o admin         //
// ("master") também pode alterar o próprio e-mail.        //
// ==================================================== //

(function () {
    const PERFIL_API_URL = "http://localhost:3000";
    const SESSAO_KEY = "usuarioLogado";
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Mostrar/ocultar senha: delegado no document (o modal é criado dinamicamente).
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".toggle-senha");
        if (!btn) return;

        const input = document.getElementById(btn.dataset.target);
        if (!input) return;

        const estaVisivel = input.type === "text";
        input.type = estaVisivel ? "password" : "text";
        btn.classList.toggle("is-visible", !estaVisivel);
        btn.setAttribute("aria-label", estaVisivel ? "Mostrar senha" : "Ocultar senha");
    });

    function getUsuario() {
        const bruto = localStorage.getItem(SESSAO_KEY);
        return bruto ? JSON.parse(bruto) : null;
    }

    function setUsuario(usuario) {
        localStorage.setItem(SESSAO_KEY, JSON.stringify(usuario));
    }

    function iniciais(nome) {
        return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
    }

    function escapeHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    function atualizarHeader(usuario) {
        const icone = document.getElementById("btnAbrirPerfil");
        if (icone) {
            icone.textContent = iniciais(usuario.nome);
            icone.title = `${usuario.nome} — editar perfil`;
        }

        const welcome = document.getElementById("userWelcome");
        if (welcome) welcome.textContent = `Olá, ${usuario.nome}`;

        const badge = document.getElementById("userRoleBadge");
        if (badge) {
            badge.textContent = usuario.role.toUpperCase();
            badge.className = `badge-role ${usuario.role}`;
        }
    }

    function exibirFeedback(overlay, mensagem, ehSucesso) {
        const feedback = overlay.querySelector("#feedbackPerfil");
        feedback.textContent = mensagem;
        feedback.className = `feedback-box ${ehSucesso ? "success" : "error"}`;
        feedback.classList.remove("hidden");
    }

    function abrirModalPerfil() {
        const usuario = getUsuario();
        if (!usuario) return;

        const ehMaster = usuario.role === "admin";

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>Editar Perfil</h3>
                    <button type="button" class="btn-close" data-close>&times;</button>
                </div>

                <form id="formPerfilModal">
                    <div class="form-group">
                        <label for="perfilNome">Nome completo</label>
                        <input type="text" id="perfilNome" required minlength="3" value="${escapeHTML(usuario.nome)}">
                    </div>

                    <div class="form-group">
                        <label for="perfilEmail">E-mail (login)</label>
                        <input type="email" id="perfilEmail" value="${escapeHTML(usuario.email)}" ${ehMaster ? "" : "disabled"}>
                        <small>${ehMaster ? "Como administrador, você pode alterar seu e-mail livremente." : "O e-mail não pode ser alterado por aqui."}</small>
                    </div>

                    <div class="form-group">
                        <label for="perfilSenha">Nova senha</label>
                        <div class="password-field">
                            <input type="password" id="perfilSenha" placeholder="Deixe em branco para manter a atual" minlength="6">
                            <button type="button" class="toggle-senha" data-target="perfilSenha" aria-label="Mostrar senha" tabindex="-1">
                                <svg class="icon-olho" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                <svg class="icon-olho-fechado" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-3.09 3.88M6.53 6.53A13.4 13.4 0 0 0 1 11s4 7 11 7a10.94 10.94 0 0 0 4.47-.94"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="perfilRole">Cargo / perfil de acesso</label>
                        <input type="text" id="perfilRole" value="${usuario.role.toUpperCase()}" disabled>
                        <small>A alteração do seu próprio cargo é bloqueada. Apenas outro administrador pode alterá-lo, pelo Painel de Gestão.</small>
                    </div>

                    <div id="feedbackPerfil" class="feedback-box hidden"></div>

                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar alterações</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => overlay.remove()));
        overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector("#formPerfilModal").addEventListener("submit", async (e) => {
            e.preventDefault();
            await salvarPerfil(overlay, usuario, ehMaster);
        });
    }

    async function salvarPerfil(overlay, usuarioAtual, ehMaster) {
        const novoNome = overlay.querySelector("#perfilNome").value.trim();
        const novaSenha = overlay.querySelector("#perfilSenha").value.trim();
        const novoEmail = overlay.querySelector("#perfilEmail").value.trim().toLowerCase();

        if (novoNome.length < 3) {
            exibirFeedback(overlay, "O nome precisa conter pelo menos 3 caracteres.");
            return;
        }

        if (novaSenha.length > 0 && novaSenha.length < 6) {
            exibirFeedback(overlay, "A nova senha deve conter no mínimo 6 caracteres.");
            return;
        }

        const dados = { nome: novoNome };
        if (novaSenha.length > 0) dados.senha = novaSenha;

        if (ehMaster && novoEmail !== usuarioAtual.email) {
            if (!novoEmail || !EMAIL_REGEX.test(novoEmail)) {
                exibirFeedback(overlay, "Informe um e-mail válido.");
                return;
            }

            try {
                const checagem = await fetch(`${PERFIL_API_URL}/usuarios?email=${encodeURIComponent(novoEmail)}`);
                if (checagem.ok) {
                    const existentes = await checagem.json();
                    if (existentes.some((u) => u.id !== usuarioAtual.id)) {
                        exibirFeedback(overlay, "Este e-mail já está em uso por outro usuário.");
                        return;
                    }
                }
            } catch (erro) {
                exibirFeedback(overlay, "Erro ao validar o e-mail informado.");
                return;
            }

            dados.email = novoEmail;
        }

        try {
            const resposta = await fetch(`${PERFIL_API_URL}/usuarios/${usuarioAtual.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            });

            if (resposta.ok) {
                const usuarioSalvo = await resposta.json();
                setUsuario(usuarioSalvo);
                atualizarHeader(usuarioSalvo);
                overlay.remove();
            } else {
                exibirFeedback(overlay, "Erro ao atualizar o perfil na API.");
            }
        } catch (erro) {
            console.error("Erro ao atualizar perfil:", erro);
            exibirFeedback(overlay, "Erro de conexão com a API json-server.");
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const usuario = getUsuario();
        if (!usuario) return;

        atualizarHeader(usuario);

        const btn = document.getElementById("btnAbrirPerfil");
        if (btn) btn.addEventListener("click", abrirModalPerfil);
    });
})();
