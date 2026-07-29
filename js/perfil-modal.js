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
                        <input type="password" id="perfilSenha" placeholder="Deixe em branco para manter a atual" minlength="6">
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
            if (!novoEmail) {
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
