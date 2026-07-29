// ==================================================== //
// LANDING PAGE NEXA — Troca de aba + Login + Cadastro   //
// Backend simulado via json-server (fetch nos endpoints). //
// ==================================================== //

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------- //
// 0. MOSTRAR/OCULTAR SENHA                              //
// ---------------------------------------------------- //
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

// ---------------------------------------------------- //
// 1. TROCA ENTRE OS MÓDULOS DE LOGIN E CADASTRO         //
// ---------------------------------------------------- //
const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabCadastroBtn = document.getElementById("tabCadastroBtn");
const painelLogin = document.getElementById("painelLogin");
const painelCadastro = document.getElementById("painelCadastro");

function abrirAba(nome) {
    const ehLogin = nome === "login";

    tabLoginBtn.classList.toggle("active", ehLogin);
    tabCadastroBtn.classList.toggle("active", !ehLogin);
    painelLogin.classList.toggle("hidden", !ehLogin);
    painelCadastro.classList.toggle("hidden", ehLogin);

    document.getElementById("auth").scrollIntoView({ behavior: "smooth", block: "start" });
}

tabLoginBtn.addEventListener("click", () => abrirAba("login"));
tabCadastroBtn.addEventListener("click", () => abrirAba("cadastro"));

document.querySelectorAll("[data-open-tab]").forEach((el) => {
    el.addEventListener("click", () => abrirAba(el.dataset.openTab));
});

// ---------------------------------------------------- //
// 2. LOGIN                                              //
// ---------------------------------------------------- //
const formLogin = document.getElementById("formLogin");
const loginEmail = document.getElementById("loginEmail");
const loginSenha = document.getElementById("loginSenha");
const feedbackLogin = document.getElementById("feedbackLogin");

function exibirErroLogin(mensagem) {
    feedbackLogin.textContent = mensagem;
    feedbackLogin.className = "feedback-box error";
    feedbackLogin.classList.remove("hidden");
}

formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailDigitado = loginEmail.value.trim().toLowerCase();
    const senhaDigitada = loginSenha.value.trim();

    feedbackLogin.classList.add("hidden");

    if (!emailDigitado || !EMAIL_REGEX.test(emailDigitado)) {
        exibirErroLogin("Informe um e-mail válido.");
        return;
    }

    if (!senhaDigitada) {
        exibirErroLogin("Informe sua senha.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/usuarios?email=${encodeURIComponent(emailDigitado)}`);

        if (!resposta.ok) {
            exibirErroLogin("Erro de conexão com o servidor na porta 3000.");
            return;
        }

        const usuariosEncontrados = await resposta.json();

        if (usuariosEncontrados.length === 0) {
            exibirErroLogin("Nenhum usuário cadastrado com este e-mail.");
            return;
        }

        const usuario = usuariosEncontrados[0];

        if (usuario.senha !== senhaDigitada) {
            exibirErroLogin("Senha incorreta! Tente novamente.");
            return;
        }

        if (!usuario.ativo) {
            exibirErroLogin("Sua conta está desativada. Entre em contato com a administração.");
            return;
        }

        Sessao.setUsuario(usuario);
        window.location.href = "../catalogo/index.html";

    } catch (erro) {
        console.error("Erro na autenticação:", erro);
        exibirErroLogin("O servidor json-server não está respondendo. Verifique se executou: npx json-server db.json");
    }
});

// ---------------------------------------------------- //
// 3. CADASTRO                                           //
// ---------------------------------------------------- //
const formCadastro = document.getElementById("formCadastro");
const cadastroNome = document.getElementById("cadastroNome");
const cadastroEmail = document.getElementById("cadastroEmail");
const cadastroSenha = document.getElementById("cadastroSenha");
const feedbackCadastro = document.getElementById("feedbackCadastro");

function exibirFeedbackCadastro(mensagem, ehSucesso = false) {
    feedbackCadastro.textContent = mensagem;
    feedbackCadastro.className = `feedback-box ${ehSucesso ? "success" : "error"}`;
    feedbackCadastro.classList.remove("hidden");
}

formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = cadastroNome.value.trim();
    const email = cadastroEmail.value.trim().toLowerCase();
    const senha = cadastroSenha.value.trim();

    feedbackCadastro.classList.add("hidden");

    if (nome.length < 3) {
        exibirFeedbackCadastro("O nome deve ter no mínimo 3 caracteres.");
        return;
    }

    if (!email || !EMAIL_REGEX.test(email)) {
        exibirFeedbackCadastro("Informe um e-mail válido.");
        return;
    }

    if (!senha) {
        exibirFeedbackCadastro("A senha é obrigatória.");
        return;
    }

    if (senha.length < 6) {
        exibirFeedbackCadastro("A senha deve conter pelo menos 6 caracteres.");
        return;
    }

    try {
        const checagemEmail = await fetch(`${API_URL}/usuarios?email=${encodeURIComponent(email)}`);

        if (checagemEmail.ok) {
            const usuariosExistentes = await checagemEmail.json();

            if (usuariosExistentes.length > 0) {
                exibirFeedbackCadastro("Este e-mail já está em uso por outro usuário.");
                return;
            }
        }

        // Todo cadastro público nasce como "aluno". Somente um admin pode
        // promover o cargo depois, pelo Painel de Gestão (US04).
        const novoUsuario = {
            id: "u_" + Date.now(),
            nome,
            email,
            senha,
            role: "aluno",
            ativo: true,
            criadoEm: new Date().toISOString()
        };

        const respostaPost = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novoUsuario)
        });

        if (respostaPost.ok) {
            exibirFeedbackCadastro("Conta criada com sucesso! Faça login para continuar.", true);
            formCadastro.reset();

            setTimeout(() => {
                abrirAba("login");
                loginEmail.value = email;
                loginSenha.focus();
            }, 1200);
        } else {
            exibirFeedbackCadastro("Erro ao registrar o usuário na API.");
        }

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        exibirFeedbackCadastro("Servidor json-server offline na porta 3000. Inicie com npx json-server db.json");
    }
});
