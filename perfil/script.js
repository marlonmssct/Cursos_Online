// ==================================================== //
// LÓGICA DE EDIÇÃO DE PERFIL (PÁGINA PERFIL)           //
// Backend simulado via json-server (fetch nos endpoints). //
// ==================================================== //

// Elementos do DOM
const userWelcome = document.getElementById("userWelcome");
const userRoleBadge = document.getElementById("userRoleBadge");
const btnLogout = document.getElementById("btnLogout");
const navAdminItem = document.getElementById("navAdminItem");

const formPerfil = document.getElementById("formPerfil");
const inputNome = document.getElementById("nome");
const inputEmail = document.getElementById("email");
const inputSenha = document.getElementById("senha");
const inputRole = document.getElementById("role");
const feedback = document.getElementById("feedback");

// ---------------------------------------------------- //
// 1. CARREGAMENTO E VERIFICAÇÃO DE SESSÃO              //
// ---------------------------------------------------- //
function carregarDadosPerfil() {
    const usuario = Sessao.getUsuario();

    if (!usuario) {
        window.location.href = "../login/index.html";
        return null;
    }

    // Atualiza o Header
    if (userWelcome) userWelcome.textContent = `Olá, ${usuario.nome}`;
    if (userRoleBadge) {
        userRoleBadge.textContent = usuario.role.toUpperCase();
        userRoleBadge.className = `badge-role ${usuario.role}`;
    }

    if ((usuario.role === "admin" || usuario.role === "editor") && navAdminItem) {
        navAdminItem.classList.remove("hidden");
    }

    // Preenche o Formulário de Perfil com os dados atuais
    inputNome.value = usuario.nome;
    inputEmail.value = usuario.email;
    inputRole.value = usuario.role.toUpperCase();

    return usuario;
}

if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        Sessao.logout();
        window.location.href = "../login/index.html";
    });
}

function exibirFeedback(msg, ehSucesso = false) {
    feedback.textContent = msg;
    feedback.className = `feedback-box ${ehSucesso ? 'success' : 'error'}`;
    feedback.classList.remove("hidden");
}

// ---------------------------------------------------- //
// 2. ATUALIZAÇÃO DOS DADOS DE PERFIL                   //
// ---------------------------------------------------- //
formPerfil.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuarioAtual = Sessao.getUsuario();
    if (!usuarioAtual) return;

    const novoNome = inputNome.value.trim();
    const novaSenha = inputSenha.value.trim();

    feedback.classList.add("hidden");

    if (novoNome.length < 3) {
        exibirFeedback("O nome precisa conter pelo menos 3 caracteres.");
        return;
    }

    // Monta os campos a serem atualizados (preservando obrigatoriamente o role original)
    const dadosAtualizados = {
        nome: novoNome
    };

    // Atualiza a senha apenas se o usuário tiver digitado uma nova senha
    if (novaSenha.length > 0) {
        if (novaSenha.length < 6) {
            exibirFeedback("A nova senha deve conter no mínimo 6 caracteres.");
            return;
        }
        dadosAtualizados.senha = novaSenha;
    }

    try {
        // Atualiza os dados via PATCH na API json-server
        const resposta = await fetch(`${API_URL}/usuarios/${usuarioAtual.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosAtualizados)
        });

        if (resposta.ok) {
            const usuarioSalvoApi = await resposta.json();

            // Atualiza a sessão no localStorage mantendo o objeto atualizado
            Sessao.setUsuario(usuarioSalvoApi);

            exibirFeedback("Perfil atualizado com sucesso!", true);
            carregarDadosPerfil(); // Atualiza a tela
        } else {
            exibirFeedback("Erro ao atualizar o perfil na API.");
        }

    } catch (erro) {
        console.error("Erro ao atualizar perfil:", erro);
        exibirFeedback("Erro de conexão com a API json-server.");
    }
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosPerfil();
});
